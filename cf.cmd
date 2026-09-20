@echo off
REM Wrangler chce Node 22+, systemovy je 20. Pouzijeme prenosny z D:\ai\tools.
REM Systemovy Node zustava netknuty, ostatni projekty o tomhle nevi.
if exist "D:\ai\tools\node22\node.exe" (
  set "PATH=D:\ai\tools\node22;%PATH%"
) else (
  echo [cf] Prenosny Node 22 nenalezen v D:\ai\tools\node22
  echo [cf] Stahni: https://nodejs.org/dist/v22.23.2/node-v22.23.2-win-x64.zip
  exit /b 1
)
npx wrangler %*
