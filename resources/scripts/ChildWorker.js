importScripts('chrome://osxmediatap/content/resources/scripts/Comm/Comm.js');
var {callInBootstrap, callInMainworker} = CommHelper.childworker;
var gWkComm = new Comm.client.worker();

function routine(aArg, aReportProgress, aComm) {
	console.log('in routine');
	aReportProgress({text:'step 1'});
	aReportProgress({text:'step 2'});

	callInBootstrap('fetchCore', undefined, function(aArg, aComm) {
		console.log('routine got from boostrap:', aArg);
	});

	return 'step 3 - done';
}
