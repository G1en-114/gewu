import { cloneWattGovernorScene } from '../schema/example';
import type {
  DrawingInput,
  DrawingPlaceholderInput,
  MechanismSceneSpec,
  SceneParseOptions,
} from '../schema/scene';

/**
 * Parse a natural-language mechanism request without a network/model
 * dependency. The current local adapter intentionally maps requests to the
 * deterministic Watt-governor teaching scene; its metadata keeps the source
 * wording available to a future AI/CAD adapter.
 */
export function parsePrompt(
  prompt: string,
  options: SceneParseOptions = {},
): MechanismSceneSpec {
  const input = typeof prompt === 'string' ? prompt.trim() : '';
  const scene = cloneWattGovernorScene();
  const keywords = classifyPrompt(input);

  scene.source = 'prompt';
  scene.title = options.title || keywords.title;
  scene.summary = keywords.summary;
  scene.metadata = {
    ...(scene.metadata || {}),
    parser: 'local-placeholder',
    intent: keywords.intent,
    ...(options.includeInputMetadata === false ? {} : { input: input || '（空输入，使用示例场景）' }),
  };
  return scene;
}

/**
 * Accepts a file-like descriptor or a drawing description. No file is read or
 * uploaded: this is a predictable local placeholder until image/CAD parsing
 * is connected. The returned scene remains fully usable by the renderer.
 */
export function parseDrawingPlaceholder(
  drawing: DrawingInput,
  options: SceneParseOptions = {},
): MechanismSceneSpec {
  const details = normalizeDrawingInput(drawing);
  const scene = cloneWattGovernorScene();
  const inputLabel = details.description || details.fileName || '未命名图纸';

  scene.source = 'drawing-placeholder';
  scene.title = options.title || '图纸占位：瓦特离心调速器';
  scene.summary = `已将“${inputLabel}”映射为可交互的瓦特离心调速器示例，等待图纸识别服务接入。`;
  scene.metadata = {
    ...(scene.metadata || {}),
    parser: 'drawing-placeholder',
    placeholder: true,
    ...(options.includeInputMetadata === false ? {} : {
      drawing: {
        fileName: details.fileName,
        mimeType: details.mimeType,
        source: details.source,
        description: details.description,
      },
    }),
  };
  return scene;
}

interface PromptClassification {
  intent: 'governor' | 'crank-slider' | 'mechanism';
  title: string;
  summary: string;
}

function classifyPrompt(prompt: string): PromptClassification {
  const normalized = prompt.toLocaleLowerCase();
  const governor = /调速器|离心球|瓦特|蒸汽机|governor|flyball|watt/.test(normalized);
  const crankSlider = /曲柄|连杆|活塞|发动机|四冲程|crank|connecting.?rod|piston|engine/.test(normalized);

  if (governor) {
    return {
      intent: 'governor',
      title: '瓦特离心调速器',
      summary: '通过旋转主轴带动飞球升降，演示转速与套筒位置的机械关系。',
    };
  }
  if (crankSlider) {
    return {
      intent: 'crank-slider',
      title: '曲柄连杆机构（示例）',
      summary: '将输入映射到可交互的曲柄—连杆—滑块机械示例，展示旋转到往复运动的转换。',
    };
  }
  return {
    intent: 'mechanism',
    title: '机械机构示例',
    summary: '未识别到专用机构关键词，已加载可交互的瓦特离心调速器示例。',
  };
}

function normalizeDrawingInput(drawing: DrawingInput): DrawingPlaceholderInput {
  if (typeof drawing === 'string') {
    return { description: drawing };
  }
  return {
    fileName: drawing.fileName,
    mimeType: drawing.mimeType,
    source: drawing.source,
    description: drawing.description,
  };
}
