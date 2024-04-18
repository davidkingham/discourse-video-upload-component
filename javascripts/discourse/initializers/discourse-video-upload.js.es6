import { withPluginApi } from "discourse/lib/plugin-api";
import { inject as service } from "@ember/service";
import VideoUploadModal from "discourse/components/video-upload-modal";

function initializeDiscourseVideoUpload(api) {
  if (settings.youtube_upload_enabled || settings.vimeo_upload_enabled) {
    api.modifyClass("component:d-editor", {
      @service modal: null,

      actions: {
        openVideoUploadModal() {
          this.modal.show(VideoUploadModal);
        },
      },
    });

    api.onToolbarCreate((tb) => {
      tb.addButton({
        id: "video-upload",
        group: "insertions",
        icon: "video",
        action: () => tb.context.send("openVideoUploadModal"),
        title: themePrefix("upload.video"),
      });
    });
  }
}

export default {
  name: "discourse-video-upload",

  initialize() {
    withPluginApi("0.8.31", initializeDiscourseVideoUpload);
  },
};
