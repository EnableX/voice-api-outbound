/// ////////////////////////////////////////////////////
//
// This is application file which accept some inputs to start a EnableX voice call
//
/// //////////////////////////////////////////////////

// eslint-disable-next-line func-names
window.onload = function () {
  // eslint-disable-next-line no-undef
  $('.voice_call_div').show();
};

// toastr library options
// eslint-disable-next-line no-undef
toastr.options = {
  closeButton: false,
  debug: false,
  newestOnTop: false,
  progressBar: false,
  positionClass: 'toast-top-right',
  preventDuplicates: false,
  onclick: null,
  showDuration: '300',
  hideDuration: '1000',
  timeOut: '5000',
  extendedTimeOut: '1000',
  showEasing: 'swing',
  hideEasing: 'linear',
  showMethod: 'fadeIn',
  hideMethod: 'fadeOut',
};

// make an ajax request to API to start a voice call
// It accepts the payload for the request
function makeCall(details, callback) {
  const xhttp = new XMLHttpRequest();
  xhttp.onreadystatechange = function () {
    if (this.readyState === 4 && this.status >= 200) {
      const response = JSON.parse(this.responseText);
      if (response.state === 'failed') {
        // eslint-disable-next-line no-undef
        toastr.error(response.state);
      } else {
        callback(response);
      }
    }
  };
  xhttp.open('POST', './create-call/', true);
  xhttp.setRequestHeader('Content-Type', 'application/json');
  xhttp.send(JSON.stringify(details));
}

//
document.getElementById('voice_call_form').addEventListener('submit', (event) => {
  event.preventDefault();

  // const retData = {
  //   name: document.getElementById('serviceName').value,
  //   owner_ref: document.getElementById('ownerReference').value,
  //   // auto_record: document.getElementsByName('recordCall').value,
  //   from: document.getElementById('fromNumber').value,
  //   to: document.getElementById('toNumber').value,
  //   action_on_connect: {
  //     play: {
  //       text: document.getElementById('promptMessage').value,
  //       voice: document.getElementById('voice').value,
  //       language: document.getElementById('language').value,
  //     },
  //   },
  // };

  const retData = {
    name: 'TEST_APP',
    owner_ref: 'XYZ',
    // auto_record: document.getElementsByName('recordCall').value,
    to: '919910056363',
    from: '3197010240003',
    action_on_connect: {
      play: {
        text: 'This is the welcome greeting',
        voice: 'female',
        language: 'en-US',
        prompt_ref: '1',
      },
    },
  };

  console.log(JSON.stringify(retData));

  makeCall(retData, (response) => {
    console.log(response);
  });
});
