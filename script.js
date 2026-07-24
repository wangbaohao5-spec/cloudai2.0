const navToggle = document.querySelector('.nav-toggle');
const navLinks = document.querySelector('.nav-links');
const contactForm = document.querySelector('.contact-form');
const generatorForm = document.querySelector('.generator-form');
const generatedTitle = document.querySelector('#generated-title');
const generatedPoints = document.querySelector('#generated-points');
const generatedDescription = document.querySelector('#generated-description');
const copyButton = document.querySelector('.copy-button');
const imageGeneratorForm = document.querySelector('.image-generator-form');
const imageLoading = document.querySelector('.image-loading');
const generatedImagePreview = document.querySelector('.generated-image-preview');
const generatedImage = document.querySelector('#generated-image');
const imageResultCaption = document.querySelector('#image-result-caption');
const imageModal = document.querySelector('.image-modal');
const modalImage = document.querySelector('.modal-image');
const modalClose = document.querySelector('.modal-close');
const chatForm = document.querySelector('.chat-form');
const chatInput = document.querySelector('#chat-input');
const chatMessages = document.querySelector('.chat-messages');
const clearChatButton = document.querySelector('.clear-chat-button');

const imagePlaceholders = [
  'assets/images/ai-placeholder-1.svg',
  'assets/images/ai-placeholder-2.svg',
  'assets/images/ai-placeholder-3.svg',
  'assets/images/ai-placeholder-4.svg',
];

const defaultChatMessage = '你好，我是 CloudAI 电商助手。你可以问我商品标题、营销卖点、图片 Prompt 或活动方案。';

const aiReplies = [
  '我建议先明确目标用户，再把卖点转化为用户能立刻感知的利益点。',
  '可以从“痛点 + 解决方案 + 使用场景 + 行动引导”四个部分组织内容。',
  '如果是电商场景，标题建议控制在简洁、具体、有差异化的表达范围内。',
  '这个方向适合搭配高对比度主视觉，并突出产品带来的效率提升。',
];

const keywordReplies = [
  {
    keywords: ['标题', '文案', '卖点', '商品'],
    reply: '文案可以先写 3 个核心卖点：解决什么问题、为什么可信、现在购买有什么理由。需要我可以继续帮你模拟一个商品标题。',
  },
  {
    keywords: ['图片', '海报', 'prompt', 'Prompt'],
    reply: '图片 Prompt 建议包含主体、场景、风格、光线和用途，例如：“智能办公工具，未来科技桌面，蓝紫渐变，高级电商海报”。',
  },
  {
    keywords: ['活动', '促销', '转化', '营销'],
    reply: '活动方案可以使用“限时权益 + 场景价值 + 明确 CTA”的结构，让用户更快理解为什么现在行动。',
  },
  {
    keywords: ['api', 'API', 'OpenAI', '接口'],
    reply: '当前模块是纯前端模拟，不会调用 API。后续接入 OpenAI 时建议通过后端代理保护 API Key。',
  },
];

const platformNames = {
  taobao: '淘宝',
  pinduoduo: '拼多多',
  shopee: 'Shopee',
  amazon: 'Amazon',
};

const platformTone = {
  taobao: '适合详情页、直播间和活动推荐，突出品质感与实用价值',
  pinduoduo: '适合拼团和限时活动，强调高性价比与日常刚需',
  shopee: '适合跨境店铺展示，表达轻快直接并突出核心卖点',
  amazon: '适合海外用户浏览，语气清晰专业并强调可信体验',
};

const styleProfiles = {
  professional: {
    label: '专业',
    titlePrefix: '专业优选',
    pitch: '以清晰可信的表达呈现商品价值',
  },
  marketing: {
    label: '营销',
    titlePrefix: '热卖爆款',
    pitch: '强化吸引力和购买理由，帮助用户快速产生兴趣',
  },
  concise: {
    label: '简洁',
    titlePrefix: '省心之选',
    pitch: '用简短直接的语言突出重点，降低用户理解成本',
  },
  creative: {
    label: '创意',
    titlePrefix: '灵感好物',
    pitch: '用更有画面感的表达讲好商品故事',
  },
};

const buildProductCopy = ({ name, type, platform, style }) => {
  const platformName = platformNames[platform] || '电商平台';
  const tone = platformTone[platform] || '适合多平台商品展示，突出商品核心价值';
  const profile = styleProfiles[style] || styleProfiles.professional;
  const title = `${profile.titlePrefix}｜${name} ${platformName}${profile.label}款${type}`;
  const points = [
    `${name} 聚焦${type}需求，帮助用户快速理解商品用途。`,
    `${platformName} 场景适配：${tone}。`,
    `${profile.label}风格文案：${profile.pitch}。`,
  ];
  const description = `${name} 是一款面向${type}用户打造的商品，适合在 ${platformName} 平台进行展示和推广。它围绕用户关注的效率、体验和可靠性进行表达，并结合${profile.label}风格增强文案吸引力。这段模拟 AI 商品文案可用于商品上架、促销活动或详情页介绍的基础内容。`;

  return { title, points, description };
};

const renderPoints = (points) => {
  generatedPoints.replaceChildren(...points.map((point) => {
    const item = document.createElement('li');
    item.textContent = point;
    return item;
  }));
};

const getGeneratedText = () => {
  const points = Array.from(generatedPoints.querySelectorAll('li'))
    .map((item) => `- ${item.textContent}`)
    .join('\n');

  return `商品标题：\n${generatedTitle.textContent}\n\n核心卖点：\n${points}\n\n商品描述：\n${generatedDescription.textContent}`;
};

const copyText = async (text) => {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textArea = document.createElement('textarea');
  textArea.value = text;
  textArea.setAttribute('readonly', '');
  textArea.style.position = 'fixed';
  textArea.style.opacity = '0';
  document.body.appendChild(textArea);
  textArea.select();
  document.execCommand('copy');
  document.body.removeChild(textArea);
};

const getAiReply = (message) => {
  const matchedReply = keywordReplies.find(({ keywords }) => (
    keywords.some((keyword) => message.includes(keyword))
  ));

  if (matchedReply) {
    return matchedReply.reply;
  }

  return aiReplies[Math.floor(Math.random() * aiReplies.length)];
};

const scrollChatToBottom = () => {
  if (!chatMessages) {
    return;
  }

  chatMessages.scrollTop = chatMessages.scrollHeight;
};

const createChatMessage = (sender, message, isThinking = false) => {
  const messageItem = document.createElement('article');
  messageItem.className = `chat-message ${sender}`;

  const avatar = document.createElement('div');
  avatar.className = 'chat-avatar';
  avatar.setAttribute('aria-hidden', 'true');
  avatar.textContent = sender === 'user' ? '你' : 'AI';

  const bubble = document.createElement('div');
  bubble.className = 'chat-bubble';

  if (isThinking) {
    bubble.innerHTML = 'AI 正在思考… <span class="thinking-dots" aria-hidden="true"><span></span><span></span><span></span></span>';
  } else {
    bubble.textContent = message;
  }

  messageItem.append(avatar, bubble);
  return messageItem;
};

const resetChat = () => {
  if (!chatMessages) {
    return;
  }

  chatMessages.replaceChildren(createChatMessage('ai', defaultChatMessage));
  scrollChatToBottom();
};

if (navToggle && navLinks) {
  navToggle.addEventListener('click', () => {
    const isOpen = navLinks.classList.toggle('open');
    navToggle.setAttribute('aria-expanded', String(isOpen));
  });

  navLinks.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      navLinks.classList.remove('open');
      navToggle.setAttribute('aria-expanded', 'false');
    });
  });
}

if (generatorForm && generatedTitle && generatedPoints && generatedDescription && copyButton) {
  generatorForm.addEventListener('submit', (event) => {
    event.preventDefault();

    const formData = new FormData(generatorForm);
    const name = formData.get('productName').trim();
    const type = formData.get('productType').trim();
    const platform = formData.get('platform');
    const style = formData.get('copyStyle');
    const result = buildProductCopy({ name, type, platform, style });

    generatedTitle.textContent = result.title;
    renderPoints(result.points);
    generatedDescription.textContent = result.description;
    copyButton.disabled = false;
    copyButton.textContent = '一键复制';
  });

  copyButton.addEventListener('click', async () => {
    if (copyButton.disabled) {
      return;
    }

    try {
      await copyText(getGeneratedText());
      copyButton.textContent = '复制成功';
    } catch (error) {
      copyButton.textContent = '复制失败';
    }

    setTimeout(() => {
      copyButton.textContent = '一键复制';
    }, 1600);
  });
}

if (imageGeneratorForm && imageLoading && generatedImagePreview && generatedImage && imageResultCaption) {
  imageGeneratorForm.addEventListener('submit', (event) => {
    event.preventDefault();

    const formData = new FormData(imageGeneratorForm);
    const prompt = formData.get('imagePrompt').trim();
    const style = formData.get('imageStyle');
    const submitButton = imageGeneratorForm.querySelector('button[type="submit"]');

    if (!prompt) {
      return;
    }

    imageLoading.hidden = false;
    generatedImagePreview.disabled = true;
    submitButton.disabled = true;
    submitButton.textContent = '生成中...';

    setTimeout(() => {
      const randomImage = imagePlaceholders[Math.floor(Math.random() * imagePlaceholders.length)];

      generatedImage.src = randomImage;
      generatedImage.alt = `${style}风格 AI 图片：${prompt}`;
      imageResultCaption.textContent = `${style}风格｜${prompt}`;
      generatedImagePreview.disabled = false;
      imageLoading.hidden = true;
      submitButton.disabled = false;
      submitButton.textContent = '重新生成图片';
    }, 2000);
  });

  generatedImagePreview.addEventListener('click', () => {
    if (generatedImagePreview.disabled || !imageModal || !modalImage) {
      return;
    }

    modalImage.src = generatedImage.src;
    modalImage.alt = generatedImage.alt;
    imageModal.hidden = false;
  });
}

if (imageModal && modalClose && modalImage) {
  const closeImageModal = () => {
    imageModal.hidden = true;
    modalImage.src = '';
  };

  modalClose.addEventListener('click', closeImageModal);
  imageModal.addEventListener('click', (event) => {
    if (event.target === imageModal) {
      closeImageModal();
    }
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !imageModal.hidden) {
      closeImageModal();
    }
  });
}

if (chatForm && chatInput && chatMessages && clearChatButton) {
  chatForm.addEventListener('submit', (event) => {
    event.preventDefault();

    const submitButton = chatForm.querySelector('button[type="submit"]');

    if (submitButton.disabled) {
      return;
    }

    const message = chatInput.value.trim();

    if (!message) {
      return;
    }

    const thinkingMessage = createChatMessage('ai', '', true);

    chatMessages.append(createChatMessage('user', message), thinkingMessage);
    chatInput.value = '';
    chatInput.style.height = '';
    submitButton.disabled = true;
    scrollChatToBottom();

    setTimeout(() => {
      thinkingMessage.replaceWith(createChatMessage('ai', getAiReply(message)));
      submitButton.disabled = false;
      chatInput.focus();
      scrollChatToBottom();
    }, 1200);
  });

  chatInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      chatForm.requestSubmit();
    }
  });

  chatInput.addEventListener('input', () => {
    chatInput.style.height = 'auto';
    chatInput.style.height = `${chatInput.scrollHeight}px`;
  });

  clearChatButton.addEventListener('click', () => {
    resetChat();
    chatInput.focus();
  });
}

if (contactForm) {
  contactForm.addEventListener('submit', (event) => {
    event.preventDefault();
    alert('感谢关注 CloudAI，我们会尽快与您联系！');
    contactForm.reset();
  });
}
