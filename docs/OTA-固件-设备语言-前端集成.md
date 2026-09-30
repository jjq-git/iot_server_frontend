# OTA / 固件 / 设备语言前端集成

> 最后更新：2026-09-11

三个设备运维页面均位于“系统调试”，使用懒加载路由并通过 [http.js](../src/api/http.js) 访问后端。

| 模块 | 路由 | 视图 | API 模块 |
| --- | --- | --- | --- |
| OTA 控制台 | `/debug/ota-console` | `OtaConsole.vue` | `src/api/ota.js` |
| 固件管理 | `/debug/firmwares` | `FirmwareManager.vue` | `src/api/firmwares.js` |
| 设备语言 | `/debug/device-language` | `DeviceLanguage.vue` | `src/api/device_language.js` |

页面要求 `device.operate` 能力，后端继续校验目标主机写 scope。设备语言页先读取 `GET /device-languages` 的固件协议 index，再调用 `POST /hosts/{host_uuid}/language` 下发运行时选择；页面不上传、列出、下载或删除独立语言文件。

后端 revision `8d41c7e9a2b6` 已删除 `/lang-packs/*`。旧 `/debug/lang-packs` 与 `/system/lang-packs` 仅作为前端书签重定向到 `/debug/device-language`，不得据此恢复旧 API。

网页管理后台的八语翻译继续由 `src/locales/*.json` 管理，与设备固件语言资源互不复用。
