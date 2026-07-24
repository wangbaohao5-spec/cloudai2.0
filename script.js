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
const historyButton = document.querySelector('.nav-history-button');
const historyPanel = document.querySelector('.history-panel');
const historyClose = document.querySelector('.history-close');
const historyList = document.querySelector('.history-list');
const historyCount = document.querySelector('.history-count');
const historyClear = document.querySelector('.history-clear');

const HISTORY_STORAGE_KEY = 'cloudaiHistoryRecords';

const imagePlaceholders = [
  'assets/images/ai-placeholder-1.svg',
  'assets/images/ai-placeholder-2.svg',
  'assets/images/ai-placeholder-3.svg',
  'assets/images/ai-placeholder-4.svg',
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


const formatHistoryTime = (date = new Date()) => (
  date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
);

const loadHistoryRecords = () => {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_STORAGE_KEY)) || [];
  } catch (error) {
    return [];
  }
};

const persistHistoryRecords = (records) => {
  localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(records));
};

const getHistoryText = (record) => {
  if (record.type === 'copy') {
    const points = (record.result.points || []).map((point) => `- ${point}`).join('\n');
    return `类型：文案生成\n生成时间：${record.createdAt}\n产品名称：${record.productName}\n产品类型：${record.productType}\n平台：${record.platform}\n文案风格：${record.copyStyle}\n\n生成结果：\n商品标题：${record.result.title}\n核心卖点：\n${points}\n商品描述：${record.result.description}`;
  }

  return `类型：图片生成\n生成时间：${record.createdAt}\nPrompt：${record.prompt}\n图片风格：${record.imageStyle}`;
};

const escapeHTML = (value) => String(value).replace(/[&<>'"]/g, (char) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  "'": '&#39;',
  '"': '&quot;',
}[char]));

const renderHistoryRecords = () => {
  if (!historyList || !historyCount) {
    return;
  }

  const records = loadHistoryRecords();
  historyCount.textContent = `共 ${records.length} 条记录`;

  if (!records.length) {
    historyList.innerHTML = '<p class="history-empty">暂无历史记录。生成文案或图片后会自动保存到这里。</p>';
    return;
  }

  historyList.replaceChildren(...records.map((record) => {
    const item = document.createElement('article');
    item.className = 'history-item';

    const badge = record.type === 'copy' ? '文案' : '图片';
    const title = record.type === 'copy' ? record.productName : record.prompt;
    const meta = record.type === 'copy'
      ? `${record.productType}｜${record.platform}｜${record.copyStyle}`
      : `${record.imageStyle}｜Prompt`;

    item.innerHTML = `
      <div class="history-item-main">
        <span class="history-badge">${badge}</span>
        <h3>${escapeHTML(title)}</h3>
        <p>${escapeHTML(meta)}</p>
        <time>${escapeHTML(record.createdAt)}</time>
      </div>
      <div class="history-actions">
        <button type="button" data-action="view">查看</button>
        <button type="button" data-action="copy">复制</button>
        <button type="button" data-action="delete">删除</button>
      </div>
      <pre class="history-detail" hidden></pre>
    `;

    const detail = item.querySelector('.history-detail');
    detail.textContent = getHistoryText(record);

    item.querySelector('[data-action="view"]').addEventListener('click', (event) => {
      detail.hidden = !detail.hidden;
      event.currentTarget.textContent = detail.hidden ? '查看' : '收起';
    });

    item.querySelector('[data-action="copy"]').addEventListener('click', async (event) => {
      try {
        await copyText(getHistoryText(record));
        event.currentTarget.textContent = '已复制';
        setTimeout(() => { event.currentTarget.textContent = '复制'; }, 1400);
      } catch (error) {
        event.currentTarget.textContent = '失败';
      }
    });

    item.querySelector('[data-action="delete"]').addEventListener('click', () => {
      persistHistoryRecords(loadHistoryRecords().filter(({ id }) => id !== record.id));
      renderHistoryRecords();
    });

    return item;
  }));
};

const saveHistoryRecord = (record) => {
  const records = loadHistoryRecords();
  records.unshift({
    ...record,
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    createdAt: formatHistoryTime(),
  });
  persistHistoryRecords(records);
  renderHistoryRecords();
};

const openHistoryPanel = () => {
  if (!historyPanel) {
    return;
  }

  renderHistoryRecords();
  historyPanel.hidden = false;
};

const closeHistoryPanel = () => {
  if (historyPanel) {
    historyPanel.hidden = true;
  }
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
    const profile = styleProfiles[style] || styleProfiles.professional;

    generatedTitle.textContent = result.title;
    renderPoints(result.points);
    generatedDescription.textContent = result.description;
    copyButton.disabled = false;
    copyButton.textContent = '一键复制';

    saveHistoryRecord({
      type: 'copy',
      title: result.title,
      productName: name,
      productType: type,
      platform: platformNames[platform] || platform,
      copyStyle: profile.label,
      result,
    });
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

      saveHistoryRecord({
        type: 'image',
        prompt,
        imageStyle: style,
      });
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

if (historyButton && historyPanel && historyClose && historyClear) {
  historyButton.addEventListener('click', () => {
    navLinks.classList.remove('open');
    navToggle.setAttribute('aria-expanded', 'false');
    openHistoryPanel();
  });

  historyClose.addEventListener('click', closeHistoryPanel);
  historyPanel.addEventListener('click', (event) => {
    if (event.target === historyPanel) {
      closeHistoryPanel();
    }
  });
  historyClear.addEventListener('click', () => {
    persistHistoryRecords([]);
    renderHistoryRecords();
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
    if (event.key === 'Escape' && historyPanel && !historyPanel.hidden) {
      closeHistoryPanel();
    }
  });
}

if (contactForm) {
  contactForm.addEventListener('submit', (event) => {
    event.preventDefault();
    alert('感谢关注 CloudAI，我们会尽快与您联系！');
    contactForm.reset();
  });
}
