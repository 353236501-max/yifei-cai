// Shared by chat and model discovery; never expose upstream bodies or credentials.
export class ModelRequestError extends Error {
  status = 502;
}

export function modelKey(submitted: unknown, fallback: unknown): string {
  const explicit = typeof submitted === 'string' ? submitted.trim() : '';
  const key = explicit || (typeof fallback === 'string' ? fallback.trim() : '');
  if (key.length < 8 || key.length > 512 || /\s/.test(key)) {
    throw new ModelRequestError('早觉雨大人，请在模型设置中填写完整的 API Key（不含 Bearer 前缀）。网页刷新后需要重新填写；线上部署不会自动继承本机密钥。');
  }
  return key;
}

export async function modelRequest(url: string, init: RequestInit, provider: string, timeoutMs = 120_000): Promise<any> {
  try {
    const response = await fetch(url, {...init, redirect: 'error', signal: AbortSignal.timeout(timeoutMs)});
    if (!response.ok) {
      // Error bodies may echo a prompt or API key. Report only the status and a safe explanation.
      await response.body?.cancel();
      const hints: Record<number, string> = {
        400: '请求参数不被模型接受，请检查模型 ID 和图片能力。',
        401: '密钥验证失败，请核对密钥所属服务商，重新粘贴完整密钥。',
        402: '账户余额或额度不足，请到所选服务商控制台检查。',
        403: '服务拒绝访问，请检查账号或模型权限。',
        404: '接口路径或模型 ID 不存在，请检查基础地址和模型名称。',
        429: '请求过于频繁或额度受限，请稍后重试。',
        500: '服务商内部错误，请稍后重试。',
        503: '服务商暂时繁忙，请稍后重试。',
      };
      throw new ModelRequestError(`早觉雨大人，${provider} 返回 HTTP ${response.status}：${hints[response.status] || '服务暂时无法完成请求，请稍后重试。'}`);
    }
    return await response.json();
  } catch (error) {
    if (error instanceof ModelRequestError) throw error;
    const name = error instanceof Error ? error.name : '';
    if (name === 'TimeoutError' || name === 'AbortError') {
      throw new ModelRequestError(`早觉雨大人，${provider} 请求超过 ${timeoutMs / 1000} 秒，请稍后重试。输入已保留。`);
    }
    if (error instanceof SyntaxError) throw new ModelRequestError(`早觉雨大人，${provider} 返回了无法解析的数据，请检查 API 基础地址。`);
    throw new ModelRequestError(`早觉雨大人，服务器未能连接 ${provider}（${new URL(url).hostname}）。请检查部署服务器的出站网络；此错误尚不能判定为密钥无效。`);
  }
}
