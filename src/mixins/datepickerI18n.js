// BootstrapVue 日期选择器的 i18n 属性包。
//
// 背景：<b-form-datepicker> 的语言是**独立于 vue-i18n** 的——不传 locale 时它按
// 浏览器语言(navigator.languages)渲染，于是会出现「界面已切英文、日期仍显示
// 『2026年8月5日星期三』」。按钮/占位文案也各有自己的 label-* prop，默认写死英文。
//
// 用法（在使用方 view 里）：
//   import datepickerI18n from '@/mixins/datepickerI18n'
//   export default {
//     mixins: [datepickerI18n],
//     // 模板：<b-form-datepicker v-model="date" v-bind="datepickerI18n" />
//   }
//
// 说明：
// - locale 直接用 vue-i18n 的 locale，项目 8 种语言的 code 本身就是标准 IETF
//   语言标签(zh-CN / en-US / ja-JP ...)，可原样传给 BootstrapVue。
// - dateFormatOptions 去掉了默认的 weekday(长星期名)，否则「2026年8月5日星期三」
//   / 「Wednesday, August 5, 2026」会把窄输入框撑爆。
// - 日历内的月份名、星期缩写由 locale 经 Intl API 驱动，无需逐个翻译。
// - 未覆盖纯 aria 的导航标签(label-prev-month / label-next-year 等)，
//   它们只对屏幕阅读器可见，仍是 BootstrapVue 的英文默认值。

export default {
  computed: {
    datepickerI18n () {
      return {
        locale: this.$i18n.locale,
        dateFormatOptions: { year: 'numeric', month: 'short', day: 'numeric' },
        labelResetButton: this.$t('common.reset'),
        labelCloseButton: this.$t('common.close'),
        labelTodayButton: this.$t('common.datepicker.today'),
        labelNoDateSelected: this.$t('common.datepicker.no_date_selected'),
        labelHelp: this.$t('common.datepicker.help')
      }
    }
  }
}
