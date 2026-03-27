import sys
import re

with open('frontend/web/src/components/OptimizationView.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

new_content = re.sub(
    r"\{activeTab === 'labor' && \([\s\S]*?\}\)\}\n\n\s*\{activeTab === 'benchmarking'",
    "{activeTab === 'labor' && (<LaborOptimizationView data={data} history={history} pondFilter={pondFilter} ponds={ponds} embedded />)}\n\n\t\t\t{activeTab === 'benchmarking'",
    content
)

with open('frontend/web/src/components/OptimizationView.tsx', 'w', encoding='utf-8') as f:
    f.write(new_content)
