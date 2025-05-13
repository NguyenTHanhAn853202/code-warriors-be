import { AppError } from "./AppError";
import { httpCode } from "./httpCode";
import { Judge0Status } from "./judge0Status";
import { URL_JUDGE0 } from "./secret";

interface ITestCase {
  input: string;
  expectedOutput: string;
}

interface IResponse {
  point: number;
  time: number;
  memory: number;
}

async function runCode_Room(
  languageId: number,
  sourceCode: string,
  testcases: ITestCase[],
  timeout: number
): Promise<IResponse> {
  if (
    !languageId ||
    !sourceCode ||
    !Array.isArray(testcases) ||
    testcases.length === 0
  ) {
    throw new AppError("Thông tin không hợp lệ", httpCode.BAD_REQUEST, "error");
  }

  const evaluate: IResponse = { point: 0, time: 0, memory: 0 };

  for (const testcase of testcases) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(
        `${URL_JUDGE0}/submissions?base64_encoded=false&wait=true`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            language_id: languageId,
            source_code: sourceCode,
            stdin: testcase.input,
            expected_output: testcase.expectedOutput,
            cpu_time_limit: Math.ceil(timeout / 1000),
          }),
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new AppError(
          "Lỗi kết nối Judge0",
          httpCode.SERVICE_UNAVAILABLE,
          "error"
        );
      }

      const result = await response.json();

      if (!result?.status) {
        throw new AppError(
          "Kết quả không hợp lệ",
          httpCode.INTERNAL_SERVER_ERROR,
          "error"
        );
      }

      if (result.status.id !== Judge0Status.Accepted) {
        throw new AppError(
          result.stderr || result.status.description || "Lỗi chạy code",
          httpCode.OK,
          "warning"
        );
      }

      if (result.time * 1000 <= timeout) {
        evaluate.point++;
      }
      evaluate.time += result.time * 1000;
      evaluate.memory += result.memory;
    } catch (error: unknown) {
      clearTimeout(timeoutId);

      if (error instanceof AppError) throw error;

      if (
        error &&
        typeof error === "object" &&
        "name" in error &&
        error.name === "AbortError"
      ) {
        throw new AppError(
          "Hết thời gian chạy code",
          httpCode.REQUEST_TIMEOUT,
          "warning"
        );
      }

      throw new AppError(
        "Lỗi không xác định",
        httpCode.INTERNAL_SERVER_ERROR,
        "error"
      );
    }
  }

  return evaluate;
}

export default runCode_Room;
