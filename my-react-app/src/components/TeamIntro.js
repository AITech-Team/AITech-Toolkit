import React from 'react';
import './TeamIntro.css';

// 导入图片
import competition1 from '../assets/images/competition1.png';
import competition2 from '../assets/images/competition2.png';
import competition3 from '../assets/images/competition3.png';
import competition4 from '../assets/images/competition4.png';
import competition5 from '../assets/images/competition5.png';
import competition6 from '../assets/images/competition6.png';

function TeamIntro() {
    return (
        <div className="team-intro">
            <div className="team-content">
                <h1>AI 技术团队介绍</h1>

                <section className="team-section">
                    <h2>一、团队成员及方向</h2>
                    <p>团队由 5 位经验丰富的核心成员组成，包括 3 位博士和 2 位资深技术专家，在深度学习与大模型领域深耕多年。团队成员理论基础扎实，实践经验丰富，擅长处理海量数据和优化复杂算法。</p>
                    <p>团队核心方向是让复杂工作流程变得更智能。精准定位企业级应用中的关键痛点，如数据孤岛、流程繁琐、决策滞后等。通过深度融合大模型与行业专业知识，致力于打造全链路的自动化解决方案，高效完成从数据理解、任务执行到策略优化的全流程。同时，团队深度探索 AI Agent（智能体）开发平台在企业级场景中的落地应用，以进一步提升智能化水平。</p>
                </section>

                <section className="team-section">
                    <h2>二、专业技能</h2>
                    <div className="skill-item">
                        <h3>人工智能基础</h3>
                        <p>团队成员熟练掌握机器学习、深度学习核心技术，精通决策树、随机森林等传统算法，以及卷积神经网络、计算机视觉、Transformer 架构等前沿技术，熟练运用 PyTorch 等深度学习框架开展研发工作。</p>
                    </div>
                    <div className="skill-item">
                        <h3>AI Agent&Agentic</h3>
                        <p>在 AI 开发应用层面，团队能够熟练驾驭 DIFY、Langchain、Coze 等 AI 开发平台，在 RAG（技术和 MCP Server 搭建方面积累了大量实战经验。</p>
                    </div>
                    <div className="skill-item">
                        <h3>其他</h3>
                        <p>此外，团队成员还熟悉机器人 ROS2 系统、NV driver、嵌入式 linux 内核、CUDA 驱动等，具备多领域技术交叉应用能力。</p>
                    </div>
                </section>

                <section className="team-section">
                    <h2>三、已有成果</h2>
                    <div className="achievement-item">
                        <h3>智能问答系统</h3>
                        <p>基于检索增强生成（RAG）技术架构，团队深度整合企业研发全周期文档数据，通过查询转换、向量索引构建、混合检索等技术，打造出企业级智能问答中枢。该系统为研发团队提供了兼具技术深度与响应效率的智能查询方案，有力推动了研发流程的数字化升级。</p>
                    </div>
                    <div className="achievement-item">
                        <h3>代码生成助手</h3>
                        <p>团队成功实现固件垂直领域代码模型微调，显著提升了研发人员固件代码开发效率。</p>
                    </div>
                    <div className="achievement-item">
                        <h3>AIPC 比赛</h3>
                        <p>在 2024 年 Intel AIPC 创新应用全国大赛中，团队凭借 OpenVINO 套件对生成式 AI 模型的优化，打造出固件领域研学交互智能体，从 2120 支参赛队伍中脱颖而出，荣获三等奖。</p>
                    </div>
                </section>

                {/* 图片展示部分 */}
                <section className="team-section">
                    <h2>团队活动与成果展示</h2>
                    <div className="competition-images">
                        <img src={competition1} alt="团队展示1" />
                        <img src={competition2} alt="团队展示2" />
                        <img src={competition3} alt="团队展示3" />
                        <img src={competition4} alt="团队展示4" />
                        <img src={competition5} alt="团队展示5" />
                        <img src={competition6} alt="团队展示6" />
                    </div>
                </section>
            </div>
        </div>
    );
}

export default TeamIntro; 