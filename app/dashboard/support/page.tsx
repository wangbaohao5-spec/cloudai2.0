import { PLATFORM_CONTACT } from "@/lib/platform-contact";
import { getSupportContact, SUPPORT_FEEDBACK_GUIDANCE, SUPPORT_FEEDBACK_TEMPLATE } from "@/lib/support";

export default function SupportPage() {
  const contact = getSupportContact(PLATFORM_CONTACT);

  return (
    <main className="dashboard-content">
      <section className="dashboard-support-page">
        <div className="dashboard-support-header">
          <p className="eyebrow">Beta Support</p>
          <h1>反馈与支持</h1>
          <p>如果你在使用 CloudAI 时遇到问题，或有功能建议，可以通过下面的方式联系我们。</p>
        </div>

        <section className="dashboard-support-grid">
          <article className="dashboard-support-card dashboard-support-card--primary cai-card cai-card--compact">
            <div>
              <h2>联系 CloudAI</h2>
              <p>CloudAI 当前处于 Beta 测试阶段。如果你遇到问题或有建议，欢迎直接反馈。</p>
            </div>

            {contact.mailto ? (
              <div className="dashboard-support-actions">
                <a className="cai-button cai-button--primary cai-button--md" href={contact.mailto}>
                  发送邮件反馈
                </a>
                <span>{contact.email}</span>
              </div>
            ) : (
              <p className="dashboard-support-fallback">
                {contact.hasAnyContact
                  ? "邮件联系方式暂未配置，可通过下方已配置的联系方式反馈。"
                  : "暂未配置在线联系方式，请联系 Beta 邀请人。"}
              </p>
            )}

            {contact.qq || contact.wechat ? (
              <dl className="dashboard-account-list">
                {contact.qq ? (
                  <div>
                    <dt>QQ</dt>
                    <dd>{contact.qq}</dd>
                  </div>
                ) : null}
                {contact.wechat ? (
                  <div>
                    <dt>微信</dt>
                    <dd>{contact.wechat}</dd>
                  </div>
                ) : null}
              </dl>
            ) : null}
          </article>

          <article className="dashboard-support-card cai-card cai-card--compact">
            <div>
              <h2>反馈时建议附上</h2>
              <p>这些信息能帮助我们更快定位问题。</p>
            </div>
            <ul className="dashboard-support-list">
              {SUPPORT_FEEDBACK_GUIDANCE.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>

          <article className="dashboard-support-card dashboard-support-card--primary cai-card cai-card--compact">
            <div>
              <h2>反馈模板</h2>
              <p>发送邮件或消息时，可以按下面的结构描述问题。</p>
            </div>
            <pre className="dashboard-support-template">{SUPPORT_FEEDBACK_TEMPLATE}</pre>
            <p className="dashboard-support-privacy">反馈时请不要发送密码、API 密钥或其他敏感凭据。</p>
          </article>
        </section>
      </section>
    </main>
  );
}
