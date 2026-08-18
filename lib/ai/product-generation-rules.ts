export const PRODUCT_TRUTHFULNESS_RULES = `
真实性规则：
- 不得编造材质、成分、功能、认证、检测报告、专利、销量、用户评价、价格或平台背书。
- 如果图片、productHint 或 generationBrief 无法确认，只能使用“可突出”“适合展示”“建议用户确认”等保守表达。
- 不得把视觉推测或营销建议写成已经确认的商品事实。
`.trim();

export const BRAND_AND_AUTHORIZATION_RULES = `
品牌与授权规则：
- 默认禁止主动生成官方授权、官方旗舰、正品保证、原厂认证、品牌联名、官方认证、国家认证、平台认证、专利认证、检测认证、医疗认证、品牌指定、独家授权等表述。
- 除非用户在 productHint、generationBrief 或 extraRequirements 中明确提供并要求保留，否则不得宣称授权、认证、正品、联名或平台背书。
- 如果图片中出现品牌或 Logo，只能保守描述为“图片中可见的品牌标识”或“品牌标识可见”，不得推断官方授权关系。
- 用户明确提供授权或认证信息时，只能保留该信息本身，不得扩展为正品保证、官方旗舰、平台认证或其它未提供背书。
`.trim();

export const ABSOLUTE_CLAIMS_RULES = `
绝对化宣传规则：
- 默认禁止使用最好、第一、顶级、100%、永久、绝对、无敌、全球领先、行业第一、零风险、保证有效、医疗治疗、治愈、立刻见效等绝对化或医疗化表达。
- 建议改用“突出”“呈现”“有助于展示”“适合”“强调”“提升观感”“更清晰地表达”“帮助用户理解”等保守表达。
- 不得虚构医学功效、治疗效果、检测结论、用户评价或量化效果。
`.trim();

export const PRODUCT_VISUAL_FIDELITY_RULES = `
商品视觉保真规则：
- 图片生成必须保持商品主体一致，不得随意改变商品类型、Logo/标志、印花/图案、颜色、材质质感、版型、结构、数量、配件、关键装饰、包装文字和商品比例。
- 允许优化光线、背景、构图，清理杂乱环境，并增强电商展示感。
- 不允许把普通商品改成另一个品牌，不允许自行添加新 Logo，不允许添加用户没有提供的认证/授权文字或不存在的配件。
- 不得为了更好看而改变商品核心结构、图案位置、包装版式或可识别细节。
`.trim();

export const PRODUCT_GENERATION_RULES_BLOCK = `
CloudAI 商品内容生成统一规范：

${PRODUCT_TRUTHFULNESS_RULES}

${BRAND_AND_AUTHORIZATION_RULES}

${ABSOLUTE_CLAIMS_RULES}

${PRODUCT_VISUAL_FIDELITY_RULES}
`.trim();
