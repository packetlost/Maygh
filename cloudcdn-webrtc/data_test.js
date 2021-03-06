let button = document.getElementById("thebutton");
let text_pc1 = document.getElementById("pc1_input");
let text_pc2 = document.getElementById("pc2_input");
let blob_pc1 = document.getElementById("pc1_browse");
let blob_pc2 = document.getElementById("pc2_browse");
let datawindow = document.getElementById("datawindow");

let pc1;
let pc2;
let dc1;
let dc2;
let channel1;
let channel2;
let num_channels;
num_channels = 0;
var datachannels = new Array(0);

let pc1_offer;
let pc2_answer;
let iter = 0;
let iter2 = 0;

let fake_audio;

function log(msg) {
    let div = document.getElementById("datawindow");
    div.innerHTML = div.innerHTML + "<p>" + msg + "</p>";
}
var fancy_log = function(msg,color) {
    var pre = document.createElement("p");
    var message = '<span style="color: ' + color + ';">' + msg + '</span>';
    pre.style.wordWrap = "break-word";
    pre.innerHTML = message;
    datawindow.appendChild(pre); // (window).* here doesn't work right

    pre.scrollIntoView(false);
};

function submitenter(myfield,e)
{
    var keycode;
    if (window.event) keycode = window.event.keyCode;
    else if (e) keycode = e.which;
    else return true;

    if (keycode == 13) {
	myfield.form.submit();
	return false;
    } else {
	return true;
    }
}

var sendit = function (which) {
    iter = iter + 1;
    //log("Sending message #" + iter + " this = " + this);
    if (which == 1) {
	dc1.send(text_pc1.value);
	text_pc1.value = "";
    } else if (which == 2) {
	dc2.send(text_pc2.value);
	text_pc2.value = "";
    } else {
	log("Unknown send " + which);
    }
};

var sendblob = function (which) {
    iter = iter + 1;
    //log("Sending blob #" + iter + " this = " + this);
    if (which == 1) {
	dc1.send(blob_pc1.files[0]);
	blob_pc1.value = "";
    } else if (which == 2) {
	dc2.send(blob_pc2.files[0]);
	blob_pc2.value = "";
    } else {
	log("Unknown sendblob " + which);
    }
};

function failed(code) {
    log("Failure callback: " + code);
}

// pc1.createOffer finished, call pc1.setLocal
function step1(offer) {
    pc1_offer = offer;
    pc1.setLocalDescription(offer, step1_5, failed);
}

function step1_5() {
    setTimeout(step2,0);
}

// pc1.setLocal finished, call pc2.setRemote
function step2() {
    pc2 = new mozRTCPeerConnection();

    pc2.ondatachannel = function(channel) {
	log("pc2 onDataChannel [" +num_channels + "] = " + channel +
            ", label='" + channel.label + "'");
	dc2 = channel;
	datachannels[num_channels] = channel;
	num_channels++;
	channel.binaryType = "blob";

	channel.onmessage = function(evt) {
            iter2 = iter2 + 1;
            if (evt.data instanceof Blob) {
		fancy_log("*** pc1 sent Blob: " + evt.data + ", length=" + evt.data.size,"red");
            } else {
		fancy_log("pc1 said: " + evt.data,"red");
            }
	};
	channel.onopen = function() {
            log("*** pc2 onopen fired, sending to " + channel);
            channel.send("pc2 says Hi there!");
	};
	channel.onclose = function() {
            log("*** pc2 onclose fired");
	};
    };
    pc2.onconnection = function() {
	log("pc2 onConnection ");
    }
    pc2.onclosedconnection = function() {
	log("pc2 onClosedConnection ");
    }

    pc2.addStream(fake_audio);
    pc2.onaddstream = function(obj) {
	log("pc2 got remote stream from pc1 " + obj.type);
    }
    pc2.setRemoteDescription(pc1_offer, step3, failed);
};

// pc2.setRemote finished, call pc2.createAnswer
function step3() {
    pc2.createAnswer(step4, failed);
}

// pc2.createAnswer finished, call pc2.setLocal
function step4(answer) {
    pc2_answer = answer;
    pc2.setLocalDescription(answer, step5, failed);
}

// pc2.setLocal finished, call pc1.setRemote
function step5() {
    pc1.setRemoteDescription(pc2_answer, step6, failed);
}

// pc1.setRemote finished, make a data channel
function step6() {
    log("HIP HIP HOORAY");
    setTimeout(step7,0);
}

function step7() {
    pc1.connectDataConnection(5000,5001);
    pc2.connectDataConnection(5001,5000);
    log("connect for data channel called");
}

function start() {
    button.innerHTML = "Stop!";
    button.onclick = stop;
    while (datawindow.firstChild) {
	datawindow.removeChild(datawindow.firstChild);
    }

    pc1 = new mozRTCPeerConnection();

    pc1.onaddstream = function(obj) {
	log("pc1 got remote stream from pc2 " + obj.type);
    }

    pc1.ondatachannel = function(channel) {
	// In case pc2 opens a channel
	log("pc1 onDataChannel [" +num_channels + "] = " + channel +
            ", label='" + channel.label + "'");
	datachannels[num_channels] = channel;
	num_channels++;

	channel.onmessage = function(evt) {
            if (evt.data instanceof Blob) {
		fancy_log("*** pc2 sent Blob: " + evt.data + ", length=" + evt.data.size,"blue");
            } else {
		fancy_log('pc2 said: ' + evt.data,"blue");
            }
	}

	channel.onopen = function() {
            log("pc1 onopen fired for " + channel);
            channel.send("pc1 says Hello out there...");
            log("pc1 state: " + channel.state);
	}
	channel.onclose = function() {
            log("pc1 onclose fired");
	};
    }
    pc1.onconnection = function() {
	log("pc1 onConnection ");
	dc1 = pc1.createDataChannel("This is pc1",{}); // reliable (TCP-like)
	//  dc1 = pc1.createDataChannel("This is pc1",{outOfOrderAllowed: true, maxRetransmitNum: 0}); // unreliable (UDP-like)
	channel = dc1;
	channel.binaryType = "blob";

	channel.onmessage = function(evt) {
            if (evt.data instanceof Blob) {
		fancy_log("*** pc2 sent Blob: " + evt.data,"blue");
            } else {
		fancy_log('pc2 said: ' + evt.data,"blue");
            }
	}
	channel.onopen = function() {
            log("pc1 onopen fired for " + channel);
	    channel.send("pc1 says Hello...");
	}
	channel.onclose = function() {
            log("pc1 onclose fired");
	};
    }
    pc1.onclosedconnection = function() {
	log("pc1 onClosedConnection ");
    }

    navigator.mozGetUserMedia({audio:true, fake:true}, function(s) {
	pc1.addStream(s);
	fake_audio = s;
	pc1.createOffer(step1, failed);
    }, function(err) { alert("Error " + err); });
}

function stop() {
    log("closed");
    pc1.close();
    pc2.close();

    button.innerHTML = "Start!";
    button.onclick = start;
}
