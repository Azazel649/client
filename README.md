# 基于故障预测的智能化生产执行系统

本项目根据开题报告搭建前后端分离的基础版本，聚焦中小型制造车间的设备管理、预测性维护和生产调度业务。当前版本先实现系统框架、基础 API、页面展示和模拟业务数据，暂不实现机器学习故障预测、RUL 计算、维护窗口优化和调度优化算法。

## 技术栈

- 前端：React + Vite + TypeScript
- 后端：FastAPI + Pydantic
- 后续算法扩展方向：Scikit-learn / TensorFlow、PuLP、Pandas、NumPy

## 项目结构

```text
.
├── backend/                # FastAPI 后端服务
│   ├── app/
│   │   ├── data.py         # 模拟业务数据
│   │   ├── main.py         # API 入口
│   │   ├── schemas.py      # 数据模型
│   │   └── services.py     # 业务服务与算法占位
│   └── requirements.txt
└── frontend/               # React 前端应用
    ├── src/
    │   ├── App.tsx
    │   ├── api.ts
    │   ├── main.tsx
    │   ├── styles.css
    │   └── types.ts
    └── package.json
```

## 后端启动

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

接口文档地址：

- Swagger UI: `http://localhost:8000/docs`
- 健康检查: `http://localhost:8000/health`

## 前端启动

```bash
cd frontend
npm install
npm run dev
```

默认访问地址：`http://localhost:5173`

如需指定后端地址，可在 `frontend/.env` 中设置：

```env
VITE_API_BASE_URL=http://localhost:8000
```

## 当前已实现内容

- 设备台账与运行状态展示
- HI、RUL、温度、转速、扭矩、工具磨损等关键指标展示
- 维护计划列表与维护窗口占位生成接口
- 生产任务列表与调度占位接口
- 车间运行概览统计

## 后续开发建议

1. 接入 Kaggle Machine Predictive Maintenance Classification 数据集，完善数据预处理和特征工程。
2. 在 `backend/app/services.py` 中替换 HI、RUL、故障风险和调度结果的占位逻辑。
3. 引入数据库持久化设备、任务、维护计划和运行指标。
4. 增加权限、日志、任务执行记录和算法实验结果对比模块。

