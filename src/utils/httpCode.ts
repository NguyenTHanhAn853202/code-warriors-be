export enum httpCode {
  OK = 200,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  REQUEST_TIMEOUT = 408,
  INTERNAL_SERVER_ERROR = 500,
  BAD_GATEWAY = 502,
  SERVICE_UNAVAILABLE = 503,
}
export const httpCodeMessage = {
  [httpCode.OK]: "OK",
  [httpCode.BAD_REQUEST]: "Bad Request",
  [httpCode.UNAUTHORIZED]: "Unauthorized",
  [httpCode.FORBIDDEN]: "Forbidden",
  [httpCode.NOT_FOUND]: "Not Found",
  [httpCode.REQUEST_TIMEOUT]: "Request Timeout",
  [httpCode.INTERNAL_SERVER_ERROR]: "Internal Server Error",
  [httpCode.BAD_GATEWAY]: "Bad Gateway",
  [httpCode.SERVICE_UNAVAILABLE]: "Service Unavailable",
};
export const httpCodeDescription = {
  [httpCode.OK]: "The request has succeeded.",
  [httpCode.BAD_REQUEST]: "The server could not understand the request due to invalid syntax.",
  [httpCode.UNAUTHORIZED]: "The client must authenticate itself to get the requested response.",
  [httpCode.FORBIDDEN]: "The client does not have access rights to the content.",
  [httpCode.NOT_FOUND]: "The server can not find the requested resource.",
  [httpCode.REQUEST_TIMEOUT]: "The server timed out waiting for the request.",
  [httpCode.INTERNAL_SERVER_ERROR]: "The server has encountered a situation it doesn't know how to handle.",
  [httpCode.BAD_GATEWAY]: "The server was acting as a gateway or proxy and received an invalid response from the upstream server.",
  [httpCode.SERVICE_UNAVAILABLE]: "The server is not ready to handle the request.",
};