---
name: new-machine
description: 在格物（Inkwork）里新建或扩充一台可拆解的线稿机器模型——从选题、零件表、建模、拆解时序、讲解步骤、子组件分级，到注册、缩略图、截图验收和提交。用户说“加一台 X”“新建机器 / 模型”“把 Y 做成能拆的”“给 Z 加一级子组件”时使用。
---

# 新建一台机器

格物的每台机器是 `src/machines/<id>/` 里的一个 `MachineDef`：零件表 + 拆解时序 + 讲解步骤 + 镜头 + 一个 R3F 模型组件。线稿渲染、剖视、三视图、拆解、搜索、目录、分享链接全由框架提供，**新机器只写数据和几何**。

照下面的顺序做，每步做完再进下一步。完整可运行的参考：`src/machines/helicopter/`（三级、联动、自定义控件），最小参考：`src/machines/excavator/cylinder.tsx`。骨架见同目录 `template.tsx`。

## 1. 先定题，再动手

写下这几行（放进文件头注释）：

- **是什么、讲什么**：一句话说清这台机器的工作原理，以及动画要让人看懂哪一个因果（例：“自由涡轮——两根轴各转各的”）。
- **尺寸来源**：公开图纸 / 规格 / “通用布局”。真实产品只用公开尺寸，不画商标；来源写进注释和 README。
- **单位与坐标**：一台机器只用一种长度单位（米、毫米或英寸）。**+x 朝前，+y 朝上，地面 y = 0，左右对称面放在 z = 0**——剖视固定沿 z = 0 切掉 z > 0 的一半（朝镜头那半），所以内部结构要沿这个面展开。
- **分级**：零件超过约 15 个、或某个大件本身就值得拆，就做子组件（见第 5 步）。一级最多 31 个零件（线稿渲染器的零件编号上限）。

## 2. 零件表 `PARTS: PartDef[]`

```ts
{ id: 'casing', index: 1, name: '机匣', en: 'Engine Casing', role: '承力 · 包住燃气通道', material: '钛合金',
  description: '……', explode: [0, 0, 0], stage: [1, 1] }
```

- `index`：1 起连续、不重复，就是图上的编号。
- **基座零件**（不动的那个）：`explode: [0, 0, 0], stage: [1, 1]`。
- `explode`：拆开时的位移，**模型单位**，方向朝“真实拆卸会拿出去的方向”。
- `stage: [a, b]`：在 0–1 拆解滑杆里这个零件移动的时间窗。按**装配逆序**排：先拆外面的，最后拆基座附近的；相邻窗口可以略重叠。逐步拆解按钮按 `b` 排序。
- 文字：中文、短句、给具体数字（转速、尺寸、温度），讲“为什么”。`role` 四到八个字。
- 螺栓组用 `boltSets` + kit 的 `<Fastener set=…>`；局部展开时一起散开的邻居写进 `neighbours`。

## 3. 模型组件

```tsx
export function Thing() {
  return (
    <group>
      <Part id="casing">
        <Turn k="th-casing" profile={…} axis="x" />
        <Callout id="casing" p={[x, y, z]} />
      </Part>
      …
    </group>
  );
}
```

- 每个零件一个 `<Part id>`，id 与 `PARTS` 对应；`<Callout>` 的 `p` 放在零件表面上、朝镜头一侧。
- 几何一律用 `src/machines/kit.tsx`：`Box`、`Span`、`Cyl`、`Rod`（两点间圆杆）、`Turn`（车削回转体）、`ArcTurn`（部分回转）、`Plate` + `poly` / `roundRect`（拉伸板）、`Pipe`（沿曲线的管）、`Hoop`（圆环）、`Fastener`；齿轮用 `gearShape`（`src/scene/geometry.ts`）。
- **缓存键 `k` 全局唯一**：`Turn` / `Plate` / `Pipe` / `ArcTurn` 按 `k` 缓存几何，换形状必须换 `k`，统一加机器前缀（`hc-`、`ts-`）。
- `Turn` 的 profile 是 `(半径, 轴向位置)` 的闭合轮廓；薄壁件给外轮廓再反向接一条内轮廓（参考 helicopter 的 `shell()` / `pod()`）。`ArcTurn` 不会自动调绕向，传 `ccw(profile)`。
- `axis: 'x'` 的回转体上，`ArcTurn` 的角度 φ 对应世界坐标 `y = −r·sinφ, z = r·cosφ`：上半圈是 φ ∈ (π, 2π)。
- 别画内部看不见又不讲的东西；要剖开讲的内部（座椅、流道、齿轮）一定要有。

## 4. 让它动起来

- 运动状态放在模块级可变对象里（`export const xxxMotion = { t: 0 }`），由一个 `Driver` 组件在 `useFrame(…, -1)` 里推进，并且只在 `useStudio.getState().running` 时前进；`dt` 用 `Math.min(dt, 0.05)` 截断。
- 动的零件包一层 `group`，在 `useFrame` 里设 `rotation` / `position`。**旋转组要放在旋转中心上**：偏离轴线的转轴，先用外层 group 平移到位，再在里面转（否则会绕原点公转）。
- 几个部件联动时，从**同一个相位量**按比例算（直升机：主旋翼 ψ、尾桨 6ψ、涡轮 14ψ），不要各自计时。
- 运动学写成导出的纯函数（`wheelAngle(s)`、`genevaState(T)`），在 `src/machines/kinematics.test.ts` 里加测试：极限位置、对称、行程、单调性、和文字说明里的数字一致。光圈 f 值反了、转向回正偏角都是这样测出来的。
- 机器专属开关 / 选择放进 `Controls`（左栏），样式用现成的：`<div className="strokes gears">` 一排按钮（选中加 `is-on`），下面 `<p className="gear-note">` 一句说明；读数用 `gauges`。

## 5. 子组件（多层次拆解）

- 子组件单独一个文件，导出**画它的组件**（如 `Turboshaft`）和它的 `MachineDef`（`id: '<父id>/<名>'`，`parent: '<父id>'`）。子组件与父级用**同一种长度单位**。
- 父级里用一个 `<Part id="engine">` 把子组件包起来、平移到位：`<Part id="engine"><group position={…}><Turboshaft /></group></Part>`。嵌套的 Part 自动不单独上色、不显示标注，“全部展开”时按子组件自己的 `explode` 散开。
- 父级 `children: { engine: 'helicopter/engine' }`；可给这个零件加 `deep: [x, y, z]`，全部展开时把它拉到旁边。
- 同一个子组件模型在父级里要省略的部分（如旋翼头单独看时的截短桨叶）用 prop 关掉：`<RotorHead blades={false} />`。
- 文件末尾导出 `export const XXX_LEVELS = [子级们]`，在 `src/machines/index.ts` 的 `ALL` 里展开。

## 6. MachineDef 与注册

```ts
export const thing: MachineDef = level({
  id: 'thing', unit: 1, bounds: [[…], […]],
  name: '…', en: '…', subtitle: '装配体 · …', summary: '9 种零件 · …，会动',
  drawingNo: 'GW-XX-00', scale: '1 : 10',
  parts: PARTS, boltSets: {}, neighbours: {}, guides: [], centreLines: [],
  steps: STEPS,
  camera: { target, offset, orthoDistance, exploded: { target, scale } },
  Model: Thing, Driver: ThingDriver, Controls: ThingControls,
});
```

- 一律用 kit 的 `level()` 包：`camera`、`bounds`、`guides`、`centreLines` 都写**模型单位**，`level()` 按 `unit` 换算。
- `unit`：让整台机器在场景里约 8–14 个单位大（例：1.4 m 的发动机 `unit: 6`，13 m 的直升机 `unit: 1`）。
- 镜头：`offset` 长度约为机器最大尺寸的 2–2.5 倍，从右前上方（+x、+y、+z）看；`exploded.scale` 1.3–2.1，按拆开后的散布范围调。
- `bounds` 是装配状态的包围盒（三视图排版用）。`centreLines` 给回转体画点画线：`[a, b, 半径]`。
- `summary` 写成 `N 种零件 · 一句亮点`（目录卡片会去掉前缀只留亮点）。子组件 `subtitle` 以“子组件 ·”开头。`drawingNo` 同一家族共用前缀，整机 `-00`，子级 `-01`、`-02`…
- `steps`：2–5 步。第一步装配好、会动、选中最值得看的零件；中间步讲原理（`section: true` 剖开、`focus` 配 `camera.foci` 特写）；最后一步 `explode: 1`。有子组件就加一步“逐级深入”。步骤可用 `apply` 设置机器专属状态。
- 顶层机器加进 `src/machines/index.ts` 的 `GROUPS` 合适的分组。
- README 的“机器”一节加一条（照现有格式：零件数、会动什么、尺寸来源）。

## 7. 验收：做完一定要看

开 dev 服务后：

```bash
npx tsc -b && npm test
node scripts/check-machines.mjs http://localhost:5188/ --only <id> --jobs 4 --shots <截图目录>
node scripts/make-thumbs.mjs http://localhost:5188/ --only <顶层id>
```

- 自检必须 0 报错。然后**逐张看截图**（每级拆开后的样子）：零件有没有飞出画面、被左栏或右下明细表挡住、标注叠在一起、子组件位置对不上。出画面就调 `camera.exploded`（`scale` 加大、`target` 往散开的方向挪）或零件的 `explode`，再截图，直到干净。
- 截图跑在软件渲染里，动画比真机慢好几倍；“第一步”的截图可能停在半拆状态。看装配好的样子用缩略图（`make-thumbs` 会等画面静止），再把缩略图合成到纸色底上查看。
- 缩略图生成后提交 `public/thumbs/<id>.webp`。不再是顶层的机器删掉它的缩略图。

## 8. 提交

一台机器一个提交，中文信息写清楚是什么、几级、会动什么，例如 `新增直升机：整机 13 个大件，三级可拆——……`。改动既有机器（取景、修 bug）分开提交。
