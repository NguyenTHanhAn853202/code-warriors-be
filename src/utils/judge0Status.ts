export enum Judge0Status {
    InQueue = 1,
    Processing = 2,
    Accepted = 3,
    WrongAnswer = 4,
    TimeLimitExceeded = 5,
    CompilationError = 6,
    RuntimeError_SIGSEGV = 7,
    RuntimeError_SIGXFSZ = 8,
    RuntimeError_SIGFPE = 9,
    RuntimeError_SIGABRT = 10,
    RuntimeError_NZEC = 11,
    RuntimeError_Other = 12,
    InternalError = 13,
    ExecFormatError = 14
  }
  