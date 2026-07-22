const navToggle = document.querySelector('.nav-toggle');
const navLinks = document.querySelector('.nav-links');
const contactForm = document.querySelector('.contact-form');
const generatorForm = document.querySelector('.generator-form');
const generatedTitle = document.querySelector('#generated-title');
const generatedPoints = document.querySelector('#generated-points');
const generatedDescription = document.querySelector('#generated-description');
const copyButton = document.querySelector('.copy-button');

const platformNames = {
  taobao: '淘宝',
  pinduoduo: '拼多多',
  shopee: 'Shopee',
  amazon: 'Amazon',
};

const styleCopy = {
  professional: {
    label: '专业',
    titlePrefix: '高效可靠',
    tone: '以稳定体验和清晰价值帮助用户完成购买决策',
  },
  marketing: {
    label: '营销',
    titlePrefix: '热卖优选',
    tone: '突出强吸引力卖点，快速激发用户兴趣和下单意愿',
  },
  concise: {
    label: '简洁',
    titlePrefix: '轻松上手',
    tone: '用直接清晰的表达呈现核心价值，减少理解成本',
  },
  creative: {
    label: '创意',
    titlePrefix: '灵感之选',
    tone: '用更有画面感的表达让商品故事更鲜明、更容易被记住',
  },
};

const buildGeneratedCopy = ({ name, type, platform, style }) => {
  const platformName = platformNames[platform] || '电商平台';
  const styleInfo = styleCopy[style] || styleCopy.professional;
  const title = `${styleInfo.titlePrefix}｜${name} ${platformName}${styleInfo.label}款商品文案`;
  const points = [
    `${name} 聚焦${type}核心需求，适合在 ${platformName} 场景中快速展示商品价值。`,
    `${styleInfo.label}风格表达，${styleInfo.tone}。`,
    `围绕标题、卖点和介绍形成完整商品文案，便于发布前继续优化。`,
  ];
  const description = `${name} 是一款面向${type}用户的优选商品。它结合 ${platformName} 用户的浏览习惯，以${styleInfo.label}风格呈现产品优势：信息清晰、卖点明确、表达自然。无论用于商品详情页、活动推广还是新品上架，都能帮助商家更快搭建基础营销内容。`;

  return { title, points, description };
};

const getCopyText = () => {
  const points = Array.from(generatedPoints.querySelectorAll('li'))
    .map((item) => `- ${item.textContent}`)
    .join('\n');

  return `${generatedTitle.textContent}\n\n商品卖点：\n${points}\n\n商品介绍：\n${generatedDescription.textContent}`;
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
    const result = buildGeneratedCopy({ name, type, platform, style });

    generatedTitle.textContent = result.title;
    generatedPoints.replaceChildren(...result.points.map((point) => {
      const item = document.createElement('li');
      item.textContent = point;
      return item;
    }));
    generatedDescription.textContent = result.description;
    copyButton.disabled = false;
    copyButton.textContent = '一键复制';
  });

  copyButton.addEventListener('click', async () => {
    if (copyButton.disabled) {
      return;
    }

    try {
      await navigator.clipboard.writeText(getCopyText());
      copyButton.textContent = '已复制';
    } catch (error) {
      copyButton.textContent = '复制失败';
    }

    setTimeout(() => {
      copyButton.textContent = '一键复制';
    }, 1600);
  });
}

if (contactForm) {
  contactForm.addEventListener('submit', (event) => {
    event.preventDefault();
    alert('感谢关注 CloudAI，我们会尽快与您联系！');
    contactForm.reset();
  });
}
