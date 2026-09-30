# LVGL-IoT 平台设备 UI 跨项目实施与分工

> 状态：旧版 Build/Artifact/WASM 实施方案已废弃
>
> 更新日期：2026-09-11

本文件原有方案已被后端仓库中的[《LVGL IoT 平台设备 UI：前端、后端与 38_index 改造说明》](../../../iot_server_backend/docs/业务/LVGL-IoT平台-设备UI跨项目实施与分工.md)完整取代，不再作为开发或验收依据。

当前唯一实施方向是：

1. `38_index` 导出冻结版本的 `WebUiDocumentV1` JSON 和资源包；
2. IoT 后端在 HN 型号软件版本上存储和管理 `ui_json`；
3. IoT 前端通过后端 API 读取数据，并使用白名单 JavaScript Renderer 安全渲染；
4. 不再扩展 Target、Capability、Build Binding、设备 Report、WASM、iframe 或旧 UI Preview 链路。

前端执行状态和待冻结契约见[《前端预研与页面/API 评审》](./LVGL-IoT平台-设备UI前端预研与页面API评审.md)。
