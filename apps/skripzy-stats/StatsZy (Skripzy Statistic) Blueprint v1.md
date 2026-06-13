StatsZy (Skripzy Statistic) Blueprint v1
Visi
StatsZy adalah web app statistik modern berbasis browser yang fokus pada kebutuhan skripsi, penelitian akademik, dan analisis data sosial/pendidikan/bisnis, dengan pengalaman pengguna mirip SPSS atau Stata tetapi berjalan 100% di static hosting tanpa backend.
Arsitektur
code
Text
StatsZy
│
├── Frontend (Next.js)
│
├── Statistical Engine
│   ├── Descriptive
│   ├── Assumption Tests
│   ├── Correlation
│   ├── Regression
│   ├── Reliability
│   ├── Validity
│   ├── PCA
│   └── ANOVA
│
├── Visualization Engine
│
├── Report Generator
│
├── Formula Engine
│
└── Local Storage Layer
Deployment:
code
Text
Cloudflare Pages
Netlify
Github Pages
Vercel Static Export
Shared Hosting
Tanpa:
code
Text
Node Server
Express
Python Backend
Database Server
Core Stack
Framework
Next.js
TypeScript
Styling
Tailwind CSS
shadcn/ui
State Management
Zustand
Store:
DatasetStore
AnalysisStore
VariableStore
ProjectStore
OutputStore
Data Table Layer
TanStack Table
Digunakan untuk:
Data View
Variable View
Output Tables
Statistical Engine
Library Inti
math.js
Digunakan untuk:
Formula Parser
Matrix Math
Big Number
ml-matrix
Digunakan untuk:
Regression
PCA
Factor Analysis
Matrix Operations
simple-statistics
Digunakan untuk:
Mean
Median
Variance
Correlation
Basic Statistics
jStat
Digunakan untuk:
Distribution Functions
p-value
t Distribution
F Distribution
Chi Square Distribution
Package Internal
@statszy/core
Berisi implementasi statistik utama.
Modul Statistik
1. Descriptive Statistics
Frequency
Percentage
Mean
Median
Mode
Range
Variance
Standard Deviation
Skewness
Kurtosis
Quartile
Percentile
2. Normality Test
Shapiro-Wilk
Kolmogorov-Smirnov
QQ Plot
Output:
Statistic
p-value
Interpretation
3. Homogeneity Test
Levene Test
Bartlett Test
4. Correlation
Pearson
Spearman
Kendall
Output:
r
p-value
Strength Category
5. Validity Test
Item Total Correlation
Corrected Item Total Correlation
Output:
Valid
Not Valid
6. Reliability Test
Cronbach Alpha
Split Half
Output:
Excellent
Good
Acceptable
Poor
7. T-Test
One Sample
Independent Sample
Paired Sample
Output:
t
df
p-value
Mean Difference
8. ANOVA
One Way ANOVA
Repeated Measures ANOVA
Post Hoc:
Tukey HSD
Bonferroni
9. Non Parametric
Mann Whitney
Wilcoxon
Kruskal Wallis
Friedman
10. Chi Square
Independence Test
Goodness of Fit
11. Regression
Linear Regression
Simple Regression
Multiple Regression
Output:
R
R²
Adjusted R²
F
t
Beta
Significance
Diagnostics
VIF
Tolerance
Durbin Watson
Residual Analysis
12. Logistic Regression
Binary Logistic Regression
Output:
Odds Ratio
Wald
Significance
Pseudo R²
13. Principal Component Analysis
PCA
Scree Plot
Loading Matrix
14. Exploratory Factor Analysis
KMO
Bartlett Test
Communality
Rotated Component Matrix
Rotation:
Varimax
Visualization Layer
Plotly
Chart:
Histogram
Boxplot
Scatter Plot
QQ Plot
Residual Plot
PCA Plot
Correlation Heatmap
Scree Plot
Formula Engine
@statszy/formula
Fitur:
COMPUTE
IF
RECODE
TRANSFORM
Contoh:
code
Text
TOTAL = Q1+Q2+Q3+Q4
code
Text
AVG = mean(Q1,Q2,Q3)
Import System
Excel
XLSX Import
Library:
SheetJS
CSV
CSV Import
JSON
Project Import
Export System
XLSX
Export Excel
CSV
Export CSV
PDF
Library:
pdf-lib
Output:
Tables
Charts
Interpretation
DOCX
Library:
docx
Storage Layer
IndexedDB
Library:
Dexie.js
Menyimpan:
Dataset
Analysis
Outputs
Projects
Offline First
SPSS-like Features
Data View
Spreadsheet Editor
Sort
Filter
Search
Copy Paste Excel
Variable View
Name
Label
Type
Width
Decimals
Measure
Role
Output Viewer
Descriptive
Correlation
Validity
Reliability
Regression
ANOVA
Roadmap V2
Mediation Analysis
Moderation Analysis
PROCESS-like Analysis
SEM Lite
Cluster Analysis
K-Means
Decision Tree
Power Analysis
Sample Size Calculator
AI Interpretation
Research Report Generator
Monorepo Structure
code
Text
apps/
└── web

packages/
├── statszy-core
├── statszy-charts
├── statszy-formula
├── statszy-report
├── statszy-storage
└── statszy-ui
Target:
100% Static Hosting
Offline First
SPSS-like Experience
Bundle Ringan
Fokus Skripsi dan Penelitian Akademik