@ECHO off
REM �ˬdNode.js�O�_�s�b
IF NOT EXIST "C:\Program Files\nodejs\nodevars.bat" (
	ECHO �Х��U����������"LTS����"�ð���w��
	START https://nodejs.org/en/#download
	SET /P %wait%=�w�˧���������N���~��
)
REM �ˬdServe.js
IF NOT EXIST %AppData%\npm\node_modules\serve\bin\serve.js (
	npm install -g serve 
)
REM �Ұ��P
serve -s build
start http://loaclhost:5000/LandingPage/me