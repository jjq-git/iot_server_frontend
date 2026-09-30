# CANopen 整体通信测试报告

> 报告编号：CANOPEN-E2E-20260819-01  
> 测试轮次：第 1 轮  
> 报告状态：执行中  
> 创建日期：2026-08-19  
> 依据文档：[CANopen 整体通信测试与验收](CANopen整体通信测试.md)

## 1. 当前结论

本轮已完成前端 CANopen 工具函数测试，3 项断言全部通过。

当前仅能确认前端的型号解析、OD 新快照判断和状态值读取逻辑正常。真实主机、MQTT、CAN 总线和 CANopen 节点的端到端用例尚未执行，因此目前不能判定“CANopen 整体通信通过”。

| 项目 | 当前结果 |
|---|---|
| 计划用例数 | 16 |
| 已执行 | 1 |
| 通过 | 1 |
| 失败 | 0 |
| 阻塞 | 0 |
| 待执行 | 15 |
| 不适用 | 0 |
| 遗留缺陷 | 0（当前未发现） |
| 整体结论 | 执行中，等待端到端测试 |

## 2. 测试环境

### 2.1 已知环境

| 项目 | 记录值 |
|---|---|
| 测试日期 | 2026-08-19 |
| 项目目录 | `F:\dengtec\iot_server_frontend` |
| 操作系统/终端 | Windows PowerShell |
| 前端提交基线 | `92f4eb2`，工作区包含未提交修改 |
| Node.js | `v20.17.0` |
| npm | `10.8.2` |
| 测试命令 | `npm run test:canopen` |
| 自动化测试文件 | `tests/canopen-utils.test.mjs` |

### 2.2 端到端环境待补充

| 项目 | 记录值 |
|---|---|
| 测试环境 | 待填写：开发 / 测试 / 预生产 / 现场 |
| 前端访问地址 | 待填写 |
| 后端版本或提交号 | 待填写 |
| MQTT 服务版本/地址 | 待填写 |
| 主机 UUID | 待填写 |
| 主机固件版本 | 待填写 |
| 节点型号编码 | 待填写 |
| 节点固件版本 | 待填写 |
| Node ID | 待填写 |
| OD 规范版本 | 待填写 |
| CAN 波特率 | 待填写 |
| 心跳周期 | 待填写 |
| 测试账号与角色 | 待填写 |
| CAN 分析仪及记录文件 | 待填写 |

## 3. 已执行测试

### TC-CAN-001 前端 CANopen 工具函数

| 项目 | 结果 |
|---|---|
| 执行状态 | 通过 |
| 执行日期 | 2026-08-19 |
| 执行命令 | `npm run test:canopen` |
| 测试数 | 3 |
| 通过数 | 3 |
| 失败数 | 0 |
| 跳过数 | 0 |
| 总耗时 | `72.5159 ms` |
| 缺陷编号 | 无 |

#### 3.1 测试项结果

| 序号 | 测试项 | 结果 | 耗时 |
|---|---|---|---|
| 1 | 只解析 OD catalog 中存在的 CANopen 型号编码 | 通过 | `1.5029 ms` |
| 2 | 拒绝误用上一次 Dump 已完成的旧 OD 快照 | 通过 | `0.5368 ms` |
| 3 | 从平铺或节点级状态结构读取当前属性值 | 通过 | `1.5843 ms` |

#### 3.2 原始输出

```text
PS F:\dengtec\iot_server_frontend> npm run test:canopen

> ito_admin_vue2@0.1.0 test:canopen
> node --test tests/canopen-utils.test.mjs

✔ resolves only catalog-backed CANopen model codes (1.5029ms)
✔ rejects a completed snapshot from the previous dump (0.5368ms)
✔ reads flat and node-scoped current values (1.5843ms)
ℹ tests 3
ℹ suites 0
ℹ pass 3
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 72.5159
```

#### 3.3 结果说明

- CANopen 型号编码解析逻辑符合当前前端约束；
- OD 诊断具备避免错误复用旧快照的基础判断；
- 设备控制台能够从当前支持的状态结构中提取属性值；
- 本用例未接入真实主机和节点，未覆盖 NMT、SDO 报文、PDO、Heartbeat、EMCY 或物理 CAN 总线。

## 4. 待执行用例

| 用例 ID | 测试内容 | 前端页面 | 状态 | 执行结果/证据 |
|---|---|---|---|---|
| TC-CAN-002 | 主机与节点准备状态 | `/debug/devices`、`/devices/nodes` | 待执行 |  |
| TC-CAN-003 | 心跳与在线状态 | `/debug/mqtt-stream`、`/debug/device-control` | 待执行 |  |
| TC-CAN-004 | NMT Start | `/debug/device-control`、`/debug/mqtt-stream` | 待执行 |  |
| TC-CAN-005 | NMT Stop 与恢复 | `/debug/device-control`、`/debug/mqtt-stream` | 待执行 |  |
| TC-CAN-006 | NMT Reset 与 Boot-up | `/debug/device-control`、`/debug/mqtt-stream` | 待执行 |  |
| TC-CAN-007 | SDO 读取与 OD Dump | `/debug/od` | 待执行 |  |
| TC-CAN-008 | 安全属性写入与回读 | `/debug/device-control`、`/debug/od` | 待执行 |  |
| TC-CAN-009 | 非法写入与 SDO Abort | `/debug/device-control`、`/history/serial` | 待执行 |  |
| TC-CAN-010 | PDO/实时状态上报 | `/debug/mqtt-stream`、`/history/sensors` | 待执行 |  |
| TC-CAN-011 | EMCY 产生、记录与恢复 | `/history/emcy`、`/debug/mqtt-stream` | 待执行 |  |
| TC-CAN-012 | 心跳丢失与节点恢复 | `/debug/mqtt-stream`、`/debug/devices` | 待执行 |  |
| TC-CAN-013 | MQTT/WebSocket 中断与恢复 | `/debug/mqtt-stream`、`/debug/device-control` | 待执行 |  |
| TC-CAN-014 | 多节点隔离 | `/debug/device-control`、`/debug/mqtt-stream`、`/debug/od` | 待执行 |  |
| TC-CAN-015 | 主机重启恢复 | `/debug/device-control`、`/debug/devices` | 待执行 |  |
| TC-CAN-016 | 权限、审计和错误提示 | 核心测试页面、`/history/audit` | 待执行 |  |

## 5. 下一步执行计划

按风险从低到高继续执行：

1. 在 `/debug/devices` 确认主机在线以及最近 120 秒发现的真实节点；
2. 在 `/devices/nodes` 核对 Node ID、型号和绑定关系；
3. 在 `/debug/mqtt-stream` 连续观察至少 5 个节点心跳周期；
4. 心跳通过后，在 `/debug/device-control` 依次测试 NMT Start、Stop 和 Reset；
5. NMT 通过后，在 `/debug/od` 执行 SDO 读取和 OD Dump；
6. 由固件人员确认安全属性后，再执行写入、回读、PDO 和异常场景；
7. 最后执行 EMCY、断线恢复、多节点和稳定性测试。

## 6. 用例执行记录

后续每执行一项，在下表中更新结果并附证据。

| 用例 ID | 结果 | 实际结果摘要 | `command_id`/时间 | 证据位置 | 缺陷编号 | 执行人 |
|---|---|---|---|---|---|---|
| TC-CAN-001 | 通过 | 3 项前端工具测试全部通过 | 2026-08-19 | 本报告第 3 节 | 无 | 待填写 |
| TC-CAN-002 | 待执行 |  |  |  |  |  |
| TC-CAN-003 | 待执行 |  |  |  |  |  |
| TC-CAN-004 | 待执行 |  |  |  |  |  |
| TC-CAN-005 | 待执行 |  |  |  |  |  |
| TC-CAN-006 | 待执行 |  |  |  |  |  |
| TC-CAN-007 | 待执行 |  |  |  |  |  |
| TC-CAN-008 | 待执行 |  |  |  |  |  |
| TC-CAN-009 | 待执行 |  |  |  |  |  |
| TC-CAN-010 | 待执行 |  |  |  |  |  |
| TC-CAN-011 | 待执行 |  |  |  |  |  |
| TC-CAN-012 | 待执行 |  |  |  |  |  |
| TC-CAN-013 | 待执行 |  |  |  |  |  |
| TC-CAN-014 | 待执行 |  |  |  |  |  |
| TC-CAN-015 | 待执行 |  |  |  |  |  |
| TC-CAN-016 | 待执行 |  |  |  |  |  |

## 7. 缺陷记录

当前未发现缺陷。后续发现问题时复制以下模板：

```text
缺陷编号：
标题：
环境：
关联用例：
主机 UUID：
Node ID：
型号/固件/OD 版本：
前置条件：
操作步骤：
预期结果：
实际结果：
HTTP 请求与返回：
command_id：
MQTT topic/payload：
CAN 帧：
主机日志：
发生时间：
复现概率：
影响范围：
临时恢复方法：
附件：
```

## 8. 证据清单

| 证据编号 | 内容 | 文件或链接 | 备注 |
|---|---|---|---|
| E-CAN-001 | TC-CAN-001 原始命令输出 | 本报告第 3.2 节 | 由用户在 PowerShell 执行 |
|  |  |  |  |

建议后续证据使用以下命名：

```text
CANOPEN-E2E-20260819-01_<用例ID>_<时间>_<证据类型>.<扩展名>
```

例如：

```text
CANOPEN-E2E-20260819-01_TC-CAN-004_110530_command-ack.png
CANOPEN-E2E-20260819-01_TC-CAN-007_112100_od-snapshot.json
CANOPEN-E2E-20260819-01_TC-CAN-011_140215_can-trace.asc
```

## 9. 最终验收

在 TC-CAN-002 至 TC-CAN-016 执行完成前，本节保持未签署状态。

| 验收角色 | 姓名 | 结论 | 日期 | 签字/备注 |
|---|---|---|---|---|
| 测试负责人 |  |  |  |  |
| 前端负责人 |  |  |  |  |
| 后端负责人 |  |  |  |  |
| 主机固件负责人 |  |  |  |  |
| 节点固件负责人 |  |  |  |  |
| 项目负责人 |  |  |  |  |

最终结论选项：

- **通过**：全部必测项通过，阻断级和严重级缺陷为 0；
- **有条件通过**：仅存在已接受且有明确关闭计划的非阻断问题；
- **不通过**：存在未通过的核心通信、安全、恢复或多节点隔离用例。
