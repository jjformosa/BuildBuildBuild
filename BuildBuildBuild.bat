@ECHO off
REM 檢查Node.js是否存在
IF NOT EXIST "C:\Program Files\nodejs\nodevars.bat" (
	ECHO 請先下載網頁中的"LTS版本"並執行安裝
	START https://nodejs.org/en/#download
	SET /P %wait%=安裝完成後按任意鍵繼續
)
REM 檢查Serve.js
IF NOT EXIST %AppData%\npm\node_modules\serve\bin\serve.js (
	npm install -g serve 
)
REM 啟動嚕
serve -s build
start http://loaclhost:5000/LandingPage/me