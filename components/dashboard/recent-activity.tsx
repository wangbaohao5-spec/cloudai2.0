const recentActivities = [
  {
    title: "无线蓝牙耳机标题优化",
    type: "商品文案",
    time: "刚刚",
  },
  {
    title: "TikTok Shop 短视频脚本建议",
    type: "AI Chat",
    time: "10 分钟前",
  },
  {
    title: "高端护肤品主图 Prompt",
    type: "AI 图片生成",
    time: "今天",
  },
];

export function RecentActivity() {
  return (
    <section className="dashboard-recent glass-card">
      <div className="dashboard-section-header">
        <div>
          <p className="eyebrow">Recent Activity</p>
          <h2>最近使用记录</h2>
        </div>
        <span>Mock</span>
      </div>
      <div className="dashboard-activity-list">
        {recentActivities.map((activity) => (
          <article className="dashboard-activity-item" key={`${activity.type}-${activity.title}`}>
            <div>
              <strong>{activity.title}</strong>
              <p>{activity.type}</p>
            </div>
            <span>{activity.time}</span>
          </article>
        ))}
      </div>
    </section>
  );
}
