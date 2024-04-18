import Component from "@ember/component";
import { action } from "@ember/object";
import { inject as service } from "@ember/service";
import { tracked } from "@glimmer/tracking";
import showModal from "discourse/lib/show-modal";

const STATUS_POLLING_INTERVAL_MILLIS = 10000;

export default class VideoUploadModal extends Component {
  @service currentUser;

  @tracked uploadProgress = 0;
  @tracked isUploading = false;
  @tracked isProcessing = false;
  @tracked defaultPrivacy = "unlisted";
  @tracked vimeoEnabled = false;
  @tracked youtubeEnabled = false;
  @tracked uploadError = null;

  constructor() {
    super(...arguments);
    this.vimeoEnabled = settings.vimeo_upload_enabled;
    this.youtubeEnabled = settings.youtube_upload_enabled;
    this.vimeoUploadScope = settings.vimeo_default_view_privacy;
  }

  didInsertElement() {
    super.didInsertElement();
    const component = this;
    setTimeout(() => $("#video-file").change(() => component.validateVideoFile(component)), 1000);
    component.setProperties({
      isProcessing: false,
      processingError: false,
      uploadError: null,
      isUploading: false,
      isAuthing: false,
    });
  }

  validateVideoFile(component) {
    const file = $("#video-file").prop("files");
    if (!file || file.length < 1) return false;
    if (!file[0].type.startsWith("video/")) {
      alert("Invalid video file");
      return false;
    }

    $("#video-title").val(file[0].name);
    $("#video-scope").val("unlisted");

    return true;
  }

  updateProgress(data, component) {
    const progress = Math.floor((data.loaded / data.total) * 100);
    component.uploadProgress = progress;
  }

  @action
  vimeoUpload() {
    const file = $("#video-file").prop("files");
    const composer = getOwner(this).lookup("controller:composer");
    const component = this;
    component.setProperties({
      isUploading: true,
      uploadProgress: 0,
      isProcessing: false,
      processingError: false,
      uploadError: null,
    });

    $("#vimeo-upload-btn").attr("disabled", "disabled");

    let uploadUrl = "";

    const uploadInst = new VimeoUpload({
      file: file[0],
      token: settings.vimeo_api_access_token,
      name: $("#video-title").val(),
      description: $("#video-description").val() + "\nby @" + component.currentUser.username,
      view: settings.vimeo_default_view_privacy,
      embed: settings.vimeo_default_embed_privacy,
      upgrade_to_1080: true,
      onError: function (data) {
        console.error("<strong>Error</strong>: " + JSON.parse(data).error, "danger");
        component.setProperties({
          uploadProgress: 0,
          isUploading: false,
          uploadError: JSON.parse(data).error,
        });
      },
      onProgress: (data) => component.updateProgress(data, component),
      onComplete: function (videoId, index) {
        component.setProperties({
          uploadProgress: 0,
          isUploading: false,
          isProcessing: true,
        });
        uploadUrl = "https://vimeo.com/" + videoId;
        component.vimeoUploadStatus(uploadInst, uploadUrl, composer, component);
      },
    });

    uploadInst.upload();
  }

  @action
  youtubeUpload() {
    const component = this;
    component.setProperties({
      isAuthing: true,
      isUploading: false,
      uploadProgress: 0,
      isProcessing: false,
      processingError: false,
      uploadError: null,
    });

    const checkScopeAndUpload = function () {
      const authResponse = gapi.auth2.getAuthInstance().currentUser.get().getAuthResponse();
      if (authResponse.scope.indexOf(ytScopes[0]) >= 0 && authResponse.scope.indexOf(ytScopes[1]) >= 0) {
        component.sendFileToYoutube();
        return true;
      }
      return false;
    };

    const ytScopes = ["https://www.googleapis.com/auth/youtube", "https://www.googleapis.com/auth/youtube.readonly"];
    gapi.load("client:auth2", function
