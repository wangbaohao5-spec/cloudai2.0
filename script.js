const navToggle = document.querySelector('.nav-toggle');
const navLinks = document.querySelector('.nav-links');
const contactForm = document.querySelector('.contact-form');
const generatorForm = document.querySelector('.generator-form');
const generatedCopy = document.querySelector('#generated-copy');
const copyButton = document.querySelector('.copy-button');

const copyTemplates = {
  marketing: ({ name, category }) => `让 ${name} 成为你的增长新引擎。这款${category}用智能创作能力加速内容生产，帮助品牌更快打动用户、提升转化，并把每一次灵感变成可落地的营销成果。`,
  professional: ({ name, category }) => `${name} 是面向现代团队打造的${category}，通过清晰的创作流程与稳定的智能辅助能力，帮助企业高效完成内容规划、文案输出与品牌表达。`,
  concise: ({ name, category }) => `${name}，一款高效易用的${category}，帮助你更快生成优质内容，让创作更简单。`,
  creative: ({ name, category }) => `把想象交给 ${name}。这款${category}像一座云端灵感工厂，为每个产品故事点亮创意火花，让文字拥有更强的吸引力。`,
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

if (generatorForm && generatedCopy && copyButton) {
  generatorForm.addEventListener('submit', (event) => {
    event.preventDefault();

    const formData = new FormData(generatorForm);
    const name = formData.get('productName').trim();
    const category = formData.get('productCategory').trim();
    const style = formData.get('copyStyle');
    const template = copyTemplates[style] || copyTemplates.marketing;

    generatedCopy.textContent = template({ name, category });
    copyButton.disabled = false;
    copyButton.textContent = '复制文案';
  });

  copyButton.addEventListener('click', async () => {
    const text = generatedCopy.textContent.trim();

    if (!text || copyButton.disabled) {
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      copyButton.textContent = '已复制';
    } catch (error) {
      copyButton.textContent = '复制失败';
    }

    setTimeout(() => {
      copyButton.textContent = '复制文案';
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
