const navToggle = document.querySelector('.nav-toggle');
const navLinks = document.querySelector('.nav-links');
const contactForm = document.querySelector('.contact-form');
const generatorForm = document.querySelector('.generator-form');
const generatedTitle = document.querySelector('#generated-title');
const generatedDescription = document.querySelector('#generated-description');

const platformNames = {
  taobao: '淘宝',
  pinduoduo: '拼多多',
  shopee: 'Shopee',
  amazon: 'Amazon',
};

const platformTone = {
  taobao: '突出品质感与实用价值，适合详情页和活动推荐使用',
  pinduoduo: '强调高性价比和日常刚需，适合快速吸引用户点击',
  shopee: '表达轻快直接，适合跨境店铺突出核心卖点',
  amazon: '语气清晰专业，适合海外用户快速理解产品优势',
};

const buildProductCopy = ({ name, type, platform }) => {
  const platformName = platformNames[platform] || '电商平台';
  const tone = platformTone[platform] || '突出商品核心价值，帮助用户快速理解产品优势';
  const title = `${name}｜${platformName}热推${type}，高效实用之选`;
  const description = `${name} 是一款面向${type}需求打造的商品，适合在 ${platformName} 平台进行展示和推广。它围绕用户关注的效率、体验和可靠性进行表达，${tone}。这段模拟 AI 商品文案可作为商品上架、促销活动或详情页介绍的基础内容。`;

  return { title, description };
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

if (generatorForm && generatedTitle && generatedDescription) {
  generatorForm.addEventListener('submit', (event) => {
    event.preventDefault();

    const formData = new FormData(generatorForm);
    const name = formData.get('productName').trim();
    const type = formData.get('productType').trim();
    const platform = formData.get('platform');
    const result = buildProductCopy({ name, type, platform });

    generatedTitle.textContent = result.title;
    generatedDescription.textContent = result.description;
  });
}

if (contactForm) {
  contactForm.addEventListener('submit', (event) => {
    event.preventDefault();
    alert('感谢关注 CloudAI，我们会尽快与您联系！');
    contactForm.reset();
  });
}
