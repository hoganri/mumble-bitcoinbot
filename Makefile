
run:
	forever app.js --spinSleepTime 0 --minUptime 0

test:
	BOTNAME="[BitcoinBot]" CHANN="Larp Lagoon" node app.js
