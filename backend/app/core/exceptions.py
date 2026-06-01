class BusinessException(Exception):
    def __init__(self, message: str, code: int = 40000):
        self.message = message
        self.code = code
        super().__init__(message)


class DataNotReadyException(BusinessException):
    def __init__(self, message: str = "数据不足，暂不能执行当前操作"):
        super().__init__(message, 40001)


class ModelInferenceException(BusinessException):
    def __init__(self, message: str = "模型推理失败"):
        super().__init__(message, 40002)


class OptimizationNoSolutionException(BusinessException):
    def __init__(self, message: str = "当前约束条件下无可行排程，请调整维护窗口或任务优先级"):
        super().__init__(message, 40003)


class DispatchConflictException(BusinessException):
    def __init__(self, message: str = "调度方案存在时间或设备能力冲突"):
        super().__init__(message, 40004)
