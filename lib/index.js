var DD = require("node-dogstatsd").StatsD;
var url = require('url');

module.exports = function (options) {
	var datadog = options.dogstatsd || new DD();
	var stat = options.stat || "node.express.router";
	var tags = options.tags || [];
	var path = options.path || false;
	var base_url = options.base_url || false;
	var response_code = options.response_code || false;

	return function (req, res, next) {
		if (!req._startTime) {
			req._startTime = new Date();
		}

		var route = url.parse(req.url).pathname;

		var end = res.end;
		res.end = function (chunk, encoding) {
			res.end = end;
			res.end(chunk, encoding);

			var have_route_path = true;

			if (!req.route || !req.route.path) {
				have_route_path = false;
			}

			var baseUrl = (base_url !== false) ? req.baseurl: '';
			var statTags = []

			statTags.push("route:" + baseUrl + route);

			if (options.method) {
				statTags.push("method:" + req.method.toLowerCase());
			}

			if (options.protocol && req.protocol) {
				statTags.push("protocol:" + req.protocol);
			}

			if (path !== false) {
				if (have_route_path) {
					statTags.push("path:" + baseUrl + req.path);
				} else {
					statTags.push("path:" + baseUrl );
				}
			}

			if (response_code) {
				statTags.push("response_code:" + res.statusCode);
				datadog.increment(stat + '.response_code.' + res.statusCode , 1, statTags);
				datadog.increment(stat + '.response_code.all' , 1, statTags);
			}

			var durationInSeconds = (new Date() - req._startTime) / 1000;
			datadog.histogram(stat + '.response_time', durationInSeconds, 1, statTags);
		};

		next();
	};
};
