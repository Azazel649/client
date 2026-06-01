# 两阶段 L 型预测可复用模块

这个目录从 `two_stage_l_predict.py` 中提取了后续项目搭建更可能复用的部分，保留预测流程本身，避开训练、评估和一次性实验输出。

## 包含内容

- `two_stage_predictor.py`：核心预测模块。
- `run_two_stage_prediction.py`：命令行入口。
- `__init__.py`：便于后续项目按包导入。

## 主要能力

1. 加载第一阶段 AMD checkpoint。
2. 读取最近 `seq_len` 行历史数据。
3. 预测未来连续变量路径。
4. 按输入的 `Tool wear [min]` 在未来路径中定位并插值。
5. 把第一阶段得到的五个变量交给第二阶段失效类型预测器。
6. 输出历史窗口、未来路径和最终 JSON 结果。

## 需要从原项目提供的资源

后续项目使用时，需要准备这些路径：

- AMD 源码目录：包含 `models/common.py`、`models/tsmoe.py`、`models/tsAMD.py`。
- 第一阶段 checkpoint 目录：例如 `checkpoints/pm_amd_v3_L/`，其中包含 `best.pt`、`config.json`、`data_meta.json`。
- 第二阶段模型文件：例如 `l_hybrid_failure_predictor.joblib`。
- 历史输入 CSV：必须包含五列：
  - `Air temperature [K]`
  - `Process temperature [K]`
  - `Rotational speed [rpm]`
  - `Torque [Nm]`
  - `Tool wear [min]`

## 命令行示例

```bash
python future_project_parts/two_stage_l_prediction/run_two_stage_prediction.py \
  --project_root . \
  --checkpoint_dir ./checkpoints \
  --name pm_amd_v3 \
  --machine_type L \
  --history_csv ./history_L.csv \
  --query_wear 120 \
  --second_stage_model ./l_hybrid_failure_predictor.joblib \
  --output_dir ./two_stage_output_L
```

如果第二阶段模型反序列化需要原训练脚本，可额外传入：

```bash
--trainer_script ./train_l_failure_rf.py
```

## 代码调用示例

```python
from future_project_parts.two_stage_l_prediction import (
    run_two_stage_prediction,
    save_prediction_outputs,
)

stage1, result = run_two_stage_prediction(
    project_root='.',
    checkpoint_root='./checkpoints',
    model_name='pm_amd_v3',
    machine_type='L',
    history_csv='./history_L.csv',
    query_wear=120,
    second_stage_model_path='./l_hybrid_failure_predictor.joblib',
)

save_prediction_outputs(stage1, result, './two_stage_output_L')
print(result['stage2_failure_prediction'])
```

## 未放入此目录的内容

- 训练脚本。
- 评估脚本。
- 原始训练数据。
- 已生成的评估结果。
- notebook 风格的一次性验证代码。

这些内容仍留在原项目中，避免未来项目骨架被训练实验文件污染。
