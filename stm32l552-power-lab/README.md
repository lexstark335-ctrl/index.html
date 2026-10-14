# STM32L552 功耗实验室

面向导师汇报的交互式功耗展示。静态 HTML，无外部依赖，支持离线使用。

**在线演示：** [STM32L552 功耗实验室](https://stm32l552-power-lab.fabled-fig-5594.chatgpt.site)

## 功能

- 对比 Run、Low-power Run、Sleep、Low-power Sleep、Stop 0/1/2、Standby 和 Shutdown。
- 在对数与线性坐标之间切换，选择温度、TYP / MAX 和低功耗 RTC 配置。
- 通过事件或自动演示查看状态转换，区分停止模式恢复与待机、关断唤醒后的系统复位。
- 估算周期平均电流、平均功率和每周期能量，查看各阶段能量贡献。
- 搜索原始记录、查看条件和数据手册页码，导出筛选后的 CSV 或估算 JSON。
- 复制包含当前配置的分享链接。

## 使用

下载此目录的 `index.html`，用 Edge 或 Chrome 打开即可。已有的公开演示链接可以直接发送给导师。

源码或数据改动后，在此目录运行：

```sh
node build.mjs
```

需要 Node.js 18 或以上版本，无需安装依赖。生成的 `index.html` 包含完整页面、交互代码和数据。

本地 HTTP 预览也可使用：

```sh
python -m http.server 8080 --bind 127.0.0.1
```

然后打开 `http://127.0.0.1:8080`。离线文件中的复制链接功能可能受浏览器权限限制。

## 文件

| 文件 | 用途 |
| --- | --- |
| `index.html` | 可直接打开的完整网站 |
| `src/index.template.html` | 页面结构和样式 |
| `src/app.js` | 图表、状态机、计算和查询逻辑 |
| `data/power-database.json` | 从所提供 Excel 提取的原始值及条件 |
| `build.mjs` | 将模板、代码和数据合并为单文件网页 |

## 数据与估算边界

数值来自所提供的 `STM32L552xx_Power_Consumption_Database.xlsx`，基于 [ST DS12737 Rev 6](https://www.st.com/resource/en/datasheet/stm32l552re.pdf)。本目录保留 5,911 条原始记录及 1,835 组条件，不包含个人本机路径、发布凭据或 Sites 项目配置。

- 概览采用明确的代表条目。运行与睡眠使用固定配置，Stop / Standby / Shutdown 使用 3 V 条目。各模式条件不同，图表表示数量级差异，不代表同条件性能比较。
- 典型值与最大值、不同温度和配置保持独立。缺失条目不插值、不替换成零。
- `µA/MHz`、符号表达式、独立电源轨和增量电流不直接合并为芯片总电流。
- 默认唤醒电流 **5 mA**、耗时 **0.2 ms** 为演示假设，应替换为实际测试值。
- 周期模型为分段恒流估算。输入电压仅换算功率和能量，不会改变选中的电流数据。
- 状态图和动画是逻辑示意，动画速度不表示实际唤醒延迟。
- 参考图片中 Stop 0 / 1 的范围已根据手册表 78 / 77 核对。3 V、25°C、RTC 关闭时，典型电流分别为 196.09 µA / 92.51 µA。

周期计算：

```text
t_idle = T - t_run - t_wake
I_avg = (I_run*t_run + I_wake*t_wake + I_idle*t_idle) / T + I_extra
P_avg = V * I_avg
E_cycle = P_avg * T
```

计算时将时间统一为秒、电流统一为安培。

该目录是网站源码的 GitHub 快照。GitHub 仓库中的后续更改需要另行发布，才会更新上述在线演示。
