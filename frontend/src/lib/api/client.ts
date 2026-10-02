export class ApiError extends Error {
  code: string;
  status: number;
  fields?: Record<string, string[]>;
  requestId?: string;

  constructor(
    status: number,
    code: string,
    message: string,
    fields?: Record<string, string[]>,
    requestId?: string
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.fields = fields;
    this.requestId = requestId;
  }
}
