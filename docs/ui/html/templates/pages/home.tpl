<!-- home（/）：登录后的落地看板。上排 KPI 计数卡 + 下方趋势图表，均按公司类型（平/静/中/终）呈现。 -->
<!-- 字段对照：客户数→companies，静音仓数→pods，型号数→pod_models/hn_models，控制器数→hosts+nodes。 -->
<!-- Handoff: 生产已有看板组件（dev 分支）：KPI 卡 = MetricCardWidget（模块 stats_preview），图表 = ChartWidget，布局走 12 栏 DashboardGrid，由 WidgetRenderer 分发。 -->
<!-- Handoff: KPI 计数取 GET /dashboard/summary；图表数据取 POST /dashboard/chart-data/query；看板模块集与顺序由公司 dashboard_modules 模板（即 company_dashboards）经 configResolver 解析，按公司类型裁剪。 -->
<section class="dashboard" aria-label="首页看板">
  <div class="kpi-section" data-kpi-section>
  <h2 class="sr-only" id="home-kpi-title">关键指标</h2>
  <div class="kpi-grid" data-kpi-grid aria-labelledby="home-kpi-title">
    <button class="kpi-card" type="button" data-kpi-view="client" data-company-types="platform manufacturer business" aria-label="客户数 128，进入客户列表">
      <span class="kpi-card__icon"><svg class="app-icon app-icon--mixed" aria-hidden="true"><use href="icons.svg#icon-customer-company-users"></use></svg></span>
      <span class="kpi-card__body">
        <span class="kpi-card__value">128</span>
        <span class="kpi-card__label">客户数</span>
      </span>
      <span class="kpi-card__delta kpi-card__delta--up">较上周 +6</span>
    </button>

    <button class="kpi-card" type="button" data-kpi-view="pod-list" data-company-types="platform manufacturer business" aria-label="静音仓数 342，进入静音仓列表">
      <span class="kpi-card__icon"><svg class="app-icon app-icon--line app-icon--pod" aria-hidden="true"><use href="icons.svg#icon-soundproof-pod"></use></svg></span>
      <span class="kpi-card__body">
        <span class="kpi-card__value">342</span>
        <span class="kpi-card__label">静音仓数</span>
      </span>
      <span class="kpi-card__delta kpi-card__delta--up">较上周 +12</span>
    </button>

    <button class="kpi-card" type="button" data-kpi-view="pod-models" data-company-types="platform manufacturer business" aria-label="型号数 26，进入型号列表">
      <span class="kpi-card__icon"><svg class="app-icon app-icon--line" aria-hidden="true"><use href="icons.svg#icon-product-model"></use></svg></span>
      <span class="kpi-card__body">
        <span class="kpi-card__value">26</span>
        <span class="kpi-card__label">型号数</span>
      </span>
      <span class="kpi-card__delta">较上周 持平</span>
    </button>

    <button class="kpi-card" type="button" data-kpi-view="hosts" data-company-types="platform manufacturer" aria-label="控制器数 468，进入主机列表">
      <span class="kpi-card__icon"><svg class="app-icon app-icon--line" aria-hidden="true"><use href="icons.svg#icon-controller-system"></use></svg></span>
      <span class="kpi-card__body">
        <span class="kpi-card__value">468</span>
        <span class="kpi-card__label">控制器数</span>
      </span>
      <span class="kpi-card__delta kpi-card__delta--down">较上周 -3</span>
    </button>
  </div>
  </div>

  <!-- 最终用户专属：首页即"我的静音仓"，直接列出本人在用的仓、当前状态，点卡片进该仓控制页；有多型号按型号分组，否则平铺。 -->
  <!-- Handoff: 生产按当前用户可访问的 pods 动态生成（GET /pods 已按 company_id + scope 过滤），分组依据 pod_models；卡片状态取设备在线/使用态；"进入控制"跳该仓控制页。 -->
  <div class="my-pods" data-company-types="enduser">
    <section class="my-pods__group" aria-labelledby="my-pods-pro-title">
      <h2 class="my-pods__title" id="my-pods-pro-title"><svg class="app-icon app-icon--line" aria-hidden="true"><use href="icons.svg#icon-product-model"></use></svg>会议仓 Pro</h2>
      <div class="pod-card-grid">
        <button class="pod-card" type="button" data-pod-view="pod-a01" data-pod-name="会议仓 A01" aria-label="会议仓 A01，在线空闲，进入控制">
          <span class="pod-card__icon"><svg class="app-icon app-icon--line app-icon--pod" aria-hidden="true"><use href="icons.svg#icon-soundproof-pod"></use></svg></span>
          <span class="pod-card__body">
            <span class="pod-card__name">会议仓 A01</span>
            <span class="pod-card__meta">上海总部 3F</span>
            <span class="status status--online pod-card__status">在线 · 空闲</span>
          </span>
          <span class="pod-card__go">进入控制<svg class="app-icon app-icon--line" aria-hidden="true"><use href="icons.svg#icon-arrow-right"></use></svg></span>
        </button>
        <button class="pod-card" type="button" data-pod-view="pod-a02" data-pod-name="会议仓 A02" aria-label="会议仓 A02，在线使用中，进入控制">
          <span class="pod-card__icon"><svg class="app-icon app-icon--line app-icon--pod" aria-hidden="true"><use href="icons.svg#icon-soundproof-pod"></use></svg></span>
          <span class="pod-card__body">
            <span class="pod-card__name">会议仓 A02</span>
            <span class="pod-card__meta">上海总部 5F</span>
            <span class="status status--online pod-card__status">在线 · 使用中</span>
          </span>
          <span class="pod-card__go">进入控制<svg class="app-icon app-icon--line" aria-hidden="true"><use href="icons.svg#icon-arrow-right"></use></svg></span>
        </button>
      </div>
    </section>
    <section class="my-pods__group" aria-labelledby="my-pods-lite-title">
      <h2 class="my-pods__title" id="my-pods-lite-title"><svg class="app-icon app-icon--line" aria-hidden="true"><use href="icons.svg#icon-product-model"></use></svg>静音舱 Lite</h2>
      <div class="pod-card-grid">
        <button class="pod-card pod-card--offline" type="button" data-pod-view="pod-b01" data-pod-name="静音舱 B01" aria-label="静音舱 B01，离线，进入控制">
          <span class="pod-card__icon"><svg class="app-icon app-icon--line app-icon--pod" aria-hidden="true"><use href="icons.svg#icon-soundproof-pod"></use></svg></span>
          <span class="pod-card__body">
            <span class="pod-card__name">静音舱 B01</span>
            <span class="pod-card__meta">深圳分部 2F</span>
            <span class="status status--offline pod-card__status">离线 · 12 分钟前</span>
          </span>
          <span class="pod-card__go">进入控制<svg class="app-icon app-icon--line" aria-hidden="true"><use href="icons.svg#icon-arrow-right"></use></svg></span>
        </button>
      </div>
    </section>
  </div>

  <h2 class="sr-only" id="home-charts-title">趋势图表</h2>
  <div class="chart-grid" data-chart-grid aria-labelledby="home-charts-title">
    <!-- 设备在线率趋势：主机/节点在线率，仅平台 + 厂家。Handoff: 模块 device_online_rate（line），POST /dashboard/chart-data/query。 -->
    <section class="content-card chart-card" data-company-types="platform manufacturer" aria-labelledby="chart-online-title">
      <header class="content-card__header">
        <div>
          <h2 id="chart-online-title">设备在线率趋势</h2>
          <p>近 7 天主机与节点在线率。</p>
        </div>
        <span class="chart-card__figure">98.6%</span>
      </header>
      <div class="chart-card__canvas">
        <svg class="chart-line" viewBox="0 0 320 120" preserveAspectRatio="none" role="img" aria-label="设备在线率折线图，近 7 天在 96% 至 99% 之间">
          <polyline class="chart-line__area" points="0,42 53,34 106,46 160,24 213,30 266,18 320,26 320,120 0,120"></polyline>
          <polyline class="chart-line__stroke" points="0,42 53,34 106,46 160,24 213,30 266,18 320,26"></polyline>
        </svg>
      </div>
      <footer class="content-card__footer chart-card__footer">
        <span>周一 – 周日</span>
        <small>近 7 天平均在线率</small>
      </footer>
    </section>

    <!-- 告警统计/趋势：设备告警级别与数量，仅平台 + 厂家。Handoff: 模块 alert_trend（line）/ alert_stats（pie），POST /dashboard/chart-data/query。 -->
    <section class="content-card chart-card" data-company-types="platform manufacturer" aria-labelledby="chart-alerts-title">
      <header class="content-card__header">
        <div>
          <h2 id="chart-alerts-title">告警统计</h2>
          <p>近 7 天各级别告警数量。</p>
        </div>
        <span class="chart-card__figure chart-card__figure--danger">17</span>
      </header>
      <div class="chart-card__canvas">
        <svg class="chart-bars" viewBox="0 0 320 120" preserveAspectRatio="none" role="img" aria-label="告警柱状图，近 7 天每日告警 1 至 6 条">
          <rect class="chart-bars__bar" x="6" y="72" width="32" height="48"></rect>
          <rect class="chart-bars__bar" x="50" y="54" width="32" height="66"></rect>
          <rect class="chart-bars__bar" x="94" y="84" width="32" height="36"></rect>
          <rect class="chart-bars__bar" x="138" y="42" width="32" height="78"></rect>
          <rect class="chart-bars__bar chart-bars__bar--danger" x="182" y="30" width="32" height="90"></rect>
          <rect class="chart-bars__bar" x="226" y="66" width="32" height="54"></rect>
          <rect class="chart-bars__bar" x="270" y="78" width="32" height="42"></rect>
        </svg>
      </div>
      <footer class="content-card__footer chart-card__footer">
        <span class="chart-legend"><span class="chart-legend__dot"></span>一般<span class="chart-legend__dot chart-legend__dot--danger"></span>严重</span>
        <small>近 7 天累计告警</small>
      </footer>
    </section>

    <!-- 静音仓使用趋势：使用次数/平均时长，四类公司都关心自己的仓。Handoff: 模块 pod_usage_trend（bar），POST /dashboard/chart-data/query。 -->
    <section class="content-card chart-card" data-company-types="platform manufacturer business enduser" aria-labelledby="chart-usage-title">
      <header class="content-card__header">
        <div>
          <h2 id="chart-usage-title">静音仓使用趋势</h2>
          <p>近 7 天使用次数与平均时长。</p>
        </div>
        <span class="chart-card__figure">1.2k</span>
      </header>
      <div class="chart-card__canvas">
        <svg class="chart-line" viewBox="0 0 320 120" preserveAspectRatio="none" role="img" aria-label="静音仓使用趋势折线图，近 7 天使用次数上升">
          <polyline class="chart-line__area" points="0,88 53,80 106,64 160,70 213,48 266,40 320,30 320,120 0,120"></polyline>
          <polyline class="chart-line__stroke" points="0,88 53,80 106,64 160,70 213,48 266,40 320,30"></polyline>
        </svg>
      </div>
      <footer class="content-card__footer chart-card__footer">
        <span>周一 – 周日</span>
        <small>近 7 天使用次数</small>
      </footer>
    </section>

    <!-- 本公司静音仓状态/使用时长：仅最终用户，只看自己在用的仓。Handoff: 模块 pod_usage_trend（bar），按当前用户 pods 过滤，POST /dashboard/chart-data/query。 -->
    <section class="content-card chart-card" data-company-types="enduser" aria-labelledby="chart-my-pods-title">
      <header class="content-card__header">
        <div>
          <h2 id="chart-my-pods-title">我的静音仓状态</h2>
          <p>本周各静音仓累计使用时长。</p>
        </div>
        <span class="chart-card__figure">3 台</span>
      </header>
      <div class="chart-card__canvas">
        <svg class="chart-bars" viewBox="0 0 320 120" preserveAspectRatio="none" role="img" aria-label="我的静音仓使用时长柱状图，3 台静音仓本周使用时长不同">
          <rect class="chart-bars__bar" x="26" y="36" width="60" height="84"></rect>
          <rect class="chart-bars__bar" x="130" y="60" width="60" height="60"></rect>
          <rect class="chart-bars__bar" x="234" y="84" width="60" height="36"></rect>
        </svg>
      </div>
      <footer class="content-card__footer chart-card__footer">
        <span>会议仓 A01 · A02 · B01</span>
        <small>本周累计使用时长</small>
      </footer>
    </section>
  </div>

  <p class="dashboard__empty" data-dashboard-empty hidden>当前公司类型暂无可展示的看板内容。</p>
</section>
