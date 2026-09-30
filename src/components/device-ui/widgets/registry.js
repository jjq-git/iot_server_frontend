import WidgetArc from './WidgetArc.vue'
import WidgetBar from './WidgetBar.vue'
import WidgetButton from './WidgetButton.vue'
import WidgetButtonMatrix from './WidgetButtonMatrix.vue'
import WidgetGeneric from './WidgetGeneric.vue'
import WidgetLabel from './WidgetLabel.vue'
import WidgetLed from './WidgetLed.vue'
import WidgetObject from './WidgetObject.vue'
import WidgetSlider from './WidgetSlider.vue'
import WidgetSpinbox from './WidgetSpinbox.vue'
import WidgetSpinner from './WidgetSpinner.vue'
import WidgetSwitch from './WidgetSwitch.vue'

export const WEB_UI_WIDGET_REGISTRY = Object.freeze({
  animimage: WidgetGeneric,
  obj: WidgetObject,
  label: WidgetLabel,
  button: WidgetButton,
  buttonmatrix: WidgetButtonMatrix,
  switch: WidgetSwitch,
  slider: WidgetSlider,
  arc: WidgetArc,
  bar: WidgetBar,
  spinbox: WidgetSpinbox,
  spinner: WidgetSpinner,
  led: WidgetLed,
  arclabel: WidgetGeneric,
  calendar: WidgetGeneric,
  'calendar-header_arrow': WidgetGeneric,
  'calendar-header_dropdown': WidgetGeneric,
  canvas: WidgetGeneric,
  chart: WidgetGeneric,
  'chart-axis': WidgetGeneric,
  'chart-cursor': WidgetGeneric,
  'chart-series': WidgetGeneric,
  checkbox: WidgetGeneric,
  dropdown: WidgetGeneric,
  'dropdown-list': WidgetGeneric,
  image: WidgetGeneric,
  imagebutton: WidgetGeneric,
  keyboard: WidgetGeneric,
  line: WidgetGeneric,
  lottie: WidgetGeneric,
  menu: WidgetGeneric,
  'menu-page': WidgetGeneric,
  msgbox: WidgetGeneric,
  'msgbox-button': WidgetGeneric,
  qrcode: WidgetGeneric,
  roller: WidgetGeneric,
  scale: WidgetGeneric,
  spangroup: WidgetGeneric,
  'spangroup-span': WidgetGeneric,
  table: WidgetGeneric,
  'table-cell': WidgetGeneric,
  'table-column': WidgetGeneric,
  tabview: WidgetGeneric,
  'tabview-tab': WidgetGeneric,
  'tabview-tab_bar': WidgetGeneric,
  'tabview-tab_button': WidgetGeneric,
  textarea: WidgetGeneric,
  tileview: WidgetGeneric,
  'tileview-tile': WidgetGeneric,
  win: WidgetGeneric,
  'win-button': WidgetGeneric
})
