import { Part } from '../../scene/Part';
import { Callout } from '../../scene/Overlay';
import type { PartDef, StepDef } from '../types';
import { Box, cone, Cyl, dome, level, Rod, Turn, tube } from '../kit';

/**
 * Apollo Command and Service Modules, along +x as on the rocket, metres.
 * Command Module: base of the cone at x = 0 (heat shield bulging behind),
 * apex at 3.2. Service Module: aft bulkhead at x = 0, forward at 3.9, the
 * SPS nozzle reaching back to −2.6.
 */

const RC = 1.96;
const ring = (i: number, n: number, off = 0) => (i / n) * Math.PI * 2 + off;

export function CommandModule() {
  return (
    <group>
      <Part id="heat-shield">
        <Turn k="cm-aft-shield" profile={dome(RC, 0, -0.28, 0.12)} axis="x" seg={56} />
        <Callout id="heat-shield" p={[-0.2, -1.2, 1.2]} />
      </Part>
      <Part id="outer-shell">
        <Turn k="cm-outer" profile={cone(RC, 0.42, 0, 3.2, 0.08)} axis="x" seg={56} />
        <Callout id="outer-shell" p={[1.6, 1.3, 0.8]} />
      </Part>
      <Part id="pressure">
        <Turn k="cm-inner" profile={[[1.72, 0.12], [1.78, 0.12], [0.62, 2.6], [0.56, 2.6]]} axis="x" seg={48} />
        <Turn k="cm-inner-floor" profile={[[0, 0.12], [1.72, 0.12], [1.72, 0.18], [0, 0.18]]} axis="x" seg={48} />
        <Callout id="pressure" p={[1.9, -0.8, 0.4]} />
      </Part>
      <Part id="couches">
        {[-0.62, 0, 0.62].map((z) => (
          <group key={z}>
            <Box c={[0.42, 0, z]} s={[0.22, 1.5, 0.5]} />
            <Box c={[0.75, 0.62, z]} s={[0.55, 0.12, 0.5]} r={[0, 0, 0.5]} />
            <Rod a={[0.3, -0.6, z]} b={[0.2, -1.3, z]} r={0.04} seg={6} />
          </group>
        ))}
        <Callout id="couches" p={[0.5, 0.9, 0.62]} />
      </Part>
      <Part id="console">
        <Box c={[1.55, 0.15, 0]} s={[0.1, 1.0, 1.9]} r={[0, 0, -0.35]} />
        <Callout id="console" p={[1.6, 0.7, 0.4]} />
      </Part>
      <Part id="chutes">
        {[0, 1, 2].map((i) => <Cyl key={i} c={[2.85, 0.22 * Math.cos(ring(i, 3)), 0.22 * Math.sin(ring(i, 3))]} r={0.2} len={0.55} axis="x" seg={16} />)}
        {[1, -1].map((s) => <Cyl key={s} c={[2.75, 0.32 * s, 0.32]} r={0.1} len={0.4} axis="x" seg={12} />)}
        <Callout id="chutes" p={[2.9, 0.5, 0.3]} />
      </Part>
      <Part id="probe">
        <Turn k="cm-probe" profile={[[0, 0], [0.35, 0], [0.35, 0.15], [0.08, 0.5], [0.08, 0.9], [0, 1.0]]} p={[3.15, 0, 0]} axis="x" seg={24} />
        <Callout id="probe" p={[3.9, 0.15, 0]} />
      </Part>
      <Part id="hatch">
        <Box c={[1.35, 0, 1.25]} s={[0.75, 0.75, 0.08]} r={[0, 0.66, 0]} />
        {[1, -1].map((s) => <Box key={s} c={[1.1, 0.95 * s, 1.0]} s={[0.3, 0.3, 0.05]} r={[0, 0.7, 0]} />)}
        <Callout id="hatch" p={[1.4, 0.4, 1.4]} />
      </Part>
    </group>
  );
}

export function ServiceModule() {
  return (
    <group>
      <Part id="skin">
        <Turn k="sm-skin" profile={tube(RC, 0, 3.9, 0.04)} axis="x" seg={56} />
        <Callout id="skin" p={[3, RC, 0.4]} />
      </Part>
      <Part id="radiators">
        {Array.from({ length: 8 }, (_, i) => (
          <group key={i} rotation={[ring(i, 8, Math.PI / 8), 0, 0]}>
            <Box c={[2.0, RC + 0.03, 0]} s={[2.6, 0.04, 0.9]} />
          </group>
        ))}
        <Callout id="radiators" p={[1.2, -RC, 0.8]} />
      </Part>
      <Part id="structure">
        <Turn k="sm-aft-bulkhead" profile={[[0.5, 0], [RC - 0.04, 0], [RC - 0.04, 0.1], [0.5, 0.1]]} axis="x" seg={56} />
        <Turn k="sm-fwd-bulkhead" profile={[[0, 3.8], [RC - 0.04, 3.8], [RC - 0.04, 3.9], [0, 3.9]]} axis="x" seg={56} />
        {Array.from({ length: 6 }, (_, i) => (
          <group key={i} rotation={[ring(i, 6), 0, 0]}>
            <Box c={[1.95, 1.2, 0]} s={[3.7, 1.5, 0.05]} />
          </group>
        ))}
        <Cyl c={[1.95, 0, 0]} r={0.5} len={3.7} axis="x" seg={24} />
        <Callout id="structure" p={[0.2, 1.3, 0.3]} />
      </Part>
      <Part id="tanks">
        {[0, 1, 2, 3].map((i) => {
          const a = ring(i, 6, Math.PI / 6) + (i > 1 ? Math.PI / 3 : 0);
          return <Cyl key={i} c={[1.95, 1.2 * Math.cos(a), 1.2 * Math.sin(a)]} r={0.5} len={3.3} axis="x" seg={24} />;
        })}
        <Callout id="tanks" p={[2, 1.2, 0.9]} />
      </Part>
      <Part id="helium">
        {[1.2, 2.7].map((x) => <Cyl key={x} c={[x, 0, 0]} r={0.42} len={0.9} axis="x" seg={20} />)}
        <Callout id="helium" p={[2.7, 0.3, 0.2]} />
      </Part>
      <Part id="fuel-cells">
        {[0, 1, 2].map((i) => {
          const a = ring(4, 6, Math.PI / 6);
          return <Cyl key={i} c={[3.35, 1.2 * Math.cos(a) + (i - 1) * 0.36, 1.2 * Math.sin(a)]} r={0.17} len={0.75} axis="x" seg={16} />;
        })}
        <Callout id="fuel-cells" p={[3.4, -0.4, -1.2]} />
      </Part>
      <Part id="sps">
        <Turn k="sps-bell" profile={[[0.25, 0], [0.42, 0], [1.2, -2.6], [1.16, -2.6], [0.38, -0.15], [0.25, -0.1]]} axis="x" seg={48} />
        <Cyl c={[0.5, 0, 0]} r={0.36} len={1.0} axis="x" seg={24} />
        <Callout id="sps" p={[-1.6, 1.0, 0.4]} />
      </Part>
      <Part id="rcs">
        {[0, 1, 2, 3].map((i) => (
          <group key={i} rotation={[(i * Math.PI) / 2 + Math.PI / 4, 0, 0]}>
            <Box c={[2.7, RC + 0.15, 0]} s={[0.5, 0.3, 0.5]} />
            {[1, -1].map((s) => <Cyl key={s} c={[2.7 + s * 0.38, RC + 0.15, 0]} r={0.05} r2={0.09} len={0.3} axis={s > 0 ? 'x' : '-x'} seg={10} />)}
          </group>
        ))}
        <Callout id="rcs" p={[2.7, RC + 0.4, 0.4]} />
      </Part>
      <Part id="hga">
        <Rod a={[0.1, -RC + 0.1, -0.2]} b={[-0.6, -RC - 0.5, -0.4]} r={0.05} seg={6} />
        {[[0.25, 0.25], [0.25, -0.25], [-0.25, 0.25], [-0.25, -0.25]].map(([dy, dz], i) => (
          <Turn key={i} k="hga-dish" profile={[[0, 0], [0.22, 0.08], [0.22, 0.1], [0, 0.02]]} p={[-0.6, -RC - 0.5 + dy, -0.4 + dz]} axis="-y" seg={20} />
        ))}
        <Callout id="hga" p={[-0.6, -RC - 0.7, -0.4]} />
      </Part>
    </group>
  );
}

const CM_PARTS: PartDef[] = [
  { id: 'heat-shield', index: 1, name: '底部防热罩', en: 'Aft Heat Shield', role: '再入防热', material: '酚醛环氧蜂窝烧蚀材料', description: '再入大气时迎着气流的一面，表面在约 2700℃ 下一层层烧蚀、碳化，把热量带走，舱内仍保持室温。', explode: [-2.6, 0, 0], stage: [0.72, 0.86] },
  { id: 'outer-shell', index: 2, name: '外防热壳', en: 'Outer Heat Shield', role: '防热 · 气动外形', material: '不锈钢蜂窝 + 烧蚀层', description: '锥形外壳，外表覆盖较薄的烧蚀层。外壳和内层承压舱之间是隔热层。', explode: [0, 4.2, 0], stage: [0.36, 0.5] },
  { id: 'pressure', index: 3, name: '承压舱', en: 'Crew Compartment', role: '密封乘员空间', material: '铝蜂窝夹层', description: '真正装空气的内壳，容积约 6 立方米，三个人要在里面生活一周多。', explode: [0, 0, 0], stage: [1, 1] },
  { id: 'couches', index: 4, name: '座椅 ×3', en: 'Crew Couches', role: '承受过载', material: '铝合金 / 帆布', description: '三张并排的躺椅，背对防热罩，发射和再入时把过载压在背上。椅架下有缓冲支柱吸收溅落冲击。', explode: [0, -3.2, 0], stage: [0.58, 0.72] },
  { id: 'console', index: 5, name: '主仪表板', en: 'Main Display Console', role: '操纵 · 显示', material: '—', description: '正对座椅的大面板，约 500 个开关和仪表，还有阿波罗制导计算机的显示键盘（DSKY）。', explode: [0, 3.0, 0], stage: [0.48, 0.6] },
  { id: 'chutes', index: 6, name: '降落伞', en: 'Parachutes', role: '溅落减速', material: '尼龙', description: '舱顶前段装着两个减速伞和三个直径 25 米的主伞，最后以约 30 km/h 落进海里。', explode: [2.6, 1.6, 0], stage: [0.14, 0.26] },
  { id: 'probe', index: 7, name: '对接探头', en: 'Docking Probe', role: '与登月舱对接', material: '钢 / 铝', description: '插进登月舱顶部的锥形“接收锥”完成对接，之后拆下来，打开通道让航天员通过。', explode: [3.0, 0, 0], stage: [0, 0.12] },
  { id: 'hatch', index: 8, name: '侧舱门与舷窗', en: 'Hatch & Windows', role: '进出 · 观察', material: '—', description: '阿波罗 1 号火灾后改成向外开、几秒钟就能打开的统一舱门。', explode: [0, 0, 3.0], stage: [0.24, 0.36] },
];

const SM_PARTS: PartDef[] = [
  { id: 'skin', index: 1, name: '外壳蒙皮', en: 'Outer Skin', role: '外壳', material: '铝蜂窝夹层', description: '一圈蜂窝夹层板，围住内部六个扇区。', explode: [0, 5.4, 0], stage: [0.12, 0.26] },
  { id: 'radiators', index: 2, name: '散热器', en: 'Radiators', role: '排出废热', material: '铝', description: '外表的散热板把燃料电池和电子设备的热量辐射到太空。', explode: [0, 7.4, 0], stage: [0, 0.14] },
  { id: 'structure', index: 3, name: '扇区结构', en: 'Sector Structure', role: '骨架', material: '铝合金', description: '六块径向隔板把舱体分成六个扇区，中间是一个圆柱形中心区，前后两块隔框。', explode: [0, 0, 0], stage: [1, 1] },
  { id: 'tanks', index: 4, name: '推进剂贮箱', en: 'SPS Propellant Tanks', role: '装推进剂', material: '钛合金', description: '四个大箱，两个装燃料（混肼）、两个装氧化剂（四氧化二氮），占了服务舱大部分体积。', explode: [-6.4, 0, 0], stage: [0.58, 0.74] },
  { id: 'helium', index: 5, name: '氦气瓶', en: 'Helium Tanks', role: '贮箱增压', material: '钛合金', description: '中心区的两个高压氦气瓶，把推进剂挤压进发动机，不需要涡轮泵。', explode: [6.0, 0, 0], stage: [0.7, 0.84] },
  { id: 'fuel-cells', index: 6, name: '燃料电池', en: 'Fuel Cells', role: '发电 · 产水', material: '—', description: '三个氢氧燃料电池为整艘飞船供电，副产品是航天员喝的水。阿波罗 13 号就是这一扇区的氧气罐爆炸。', explode: [6.5, -1.5, -1.5], stage: [0.44, 0.58] },
  { id: 'sps', index: 7, name: '服务推进发动机', en: 'Service Propulsion Engine', role: '变轨', material: '铌合金 / 钛', description: '推力约 9.1 吨力，用自燃推进剂，可多次点火：进入月球轨道和返回地球全靠它，必须一次成功。', explode: [-3.0, 0, 0], stage: [0.26, 0.4] },
  { id: 'rcs', index: 8, name: '姿控喷管组', en: 'RCS Quads', role: '姿态控制', material: '—', description: '四组十字形排列的小喷管，控制整艘飞船转动和对接时的平移。', explode: [0, 0, 5.2], stage: [0.08, 0.2] },
  { id: 'hga', index: 9, name: '高增益天线', en: 'High-Gain Antenna', role: '远距离通信', material: '—', description: '四个小抛物面组成的天线，在月球距离上传回电视和数据。发射时折叠在尾部。', explode: [-1.2, -3.2, 0], stage: [0.36, 0.48] },
];

export const cmLevel = level({
  id: 'saturn-v/cm',
  parent: 'saturn-v',
  unit: 2.4,
  bounds: [[-0.3, -1.96, -1.96], [4.15, 1.96, 1.96]],
  name: '指令舱',
  en: 'Command Module',
  subtitle: '子组件 · 三人乘员舱 · 唯一返回地球的部分',
  summary: '8 种零件：防热罩、承压舱、座椅、仪表板、降落伞…',
  drawingNo: 'GW-AP-31',
  scale: '1 : 20',
  parts: CM_PARTS,
  boltSets: {},
  neighbours: {},
  guides: [{ stage: 'heat-shield', origin: [-0.28, 0, 0] }, { stage: 'probe', origin: [4.15, 0, 0] }],
  centreLines: [[[-0.8, 0, 0], [4.6, 0, 0], 2.1]],
  steps: [
    { title: '指令舱', en: 'Command Module', body: '高 3.2 米、底径 3.9 米的圆锥，三名航天员往返月球都坐在这里。', state: { explode: 0, section: false, running: false, select: null, focus: null } },
    { title: '剖视', en: 'Section', body: '剖开看两层壳：外面是防热壳，里面是承压舱；三张躺椅背对着底部防热罩，前方是仪表板，舱顶前段塞着降落伞。', state: { explode: 0, section: true, running: false, select: 'couches', focus: null } },
    { title: '拆开', en: 'Teardown', body: '先拆对接探头和降落伞，打开舱门，揭开外防热壳，取出仪表板和座椅，最后卸下底部防热罩。', state: { explode: 1, section: false, running: false, select: null, focus: null } },
  ] as StepDef[],
  camera: { target: [1.6, 0, 0], offset: [5, 4, 9], orthoDistance: 32, exploded: { target: [1.8, 2, 0.5], scale: 3 } },
  Model: CommandModule,
});

export const smLevel = level({
  id: 'saturn-v/sm',
  parent: 'saturn-v',
  unit: 1.6,
  bounds: [[-2.6, -2.6, -1.96], [3.9, 1.96, 1.96]],
  name: '服务舱',
  en: 'Service Module',
  subtitle: '子组件 · 主发动机、推进剂、电源',
  summary: '9 种零件：服务推进发动机、贮箱、燃料电池、氦气瓶…',
  drawingNo: 'GW-AP-32',
  scale: '1 : 30',
  parts: SM_PARTS,
  boltSets: {},
  neighbours: {},
  guides: [{ stage: 'sps', origin: [0, 0, 0] }, { stage: 'skin', origin: [2, RC, 0] }],
  centreLines: [[[-3.2, 0, 0], [4.5, 0, 0], 2.1]],
  steps: [
    { title: '服务舱', en: 'Service Module', body: '指令舱后面的圆柱段：主发动机、推进剂、电源、氧气都在这里，返回地球再入前才抛掉。', state: { explode: 0, section: false, running: false, select: null, focus: null } },
    { title: '剖视', en: 'Section', body: '剖开看六个扇区：四个大推进剂箱各占一个，燃料电池占一个，中心区是两个氦气瓶，发动机从后面伸出。', state: { explode: 0, section: true, running: false, select: 'tanks', focus: null } },
    { title: '拆开', en: 'Teardown', body: '拆下散热器、姿控喷管和外壳，再拆主发动机、天线、燃料电池、贮箱和氦气瓶，剩下扇区结构。', state: { explode: 1, section: false, running: false, select: null, focus: null } },
  ] as StepDef[],
  camera: { target: [0.8, 0, 0], offset: [7, 6, 13], orthoDistance: 45, exploded: { target: [0.8, 2.6, 0.8], scale: 2.6 } },
  Model: ServiceModule,
});

