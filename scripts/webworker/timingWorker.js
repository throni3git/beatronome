var timerId = null;
var interval = 100;

function tick() {
	postMessage("tick");
}

self.onmessage = function(event) {
    if (event.data === "start") {
		console.log("start");
		timerId = setInterval(tick, interval);
    }
	else if (event.data.interval) {
		interval = event.data.interval;
		console.log("set interval to " + interval + "ms");
		if (timerId) {
			clearInterval(timerId);
			timerId = setInterval(tick, interval);
		}
	}
	else if (event.data === "stop") {
		console.log("stop");
		clearInterval(timerId);
		timerId = null;
	}
};
