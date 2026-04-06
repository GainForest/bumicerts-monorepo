import { useEffect, useState } from "react";

type ModalInfo = {
  dismissible: boolean;
  title: Element | string;
  description: Element | string;
};

const DEFAULT_MODAL_INFO: ModalInfo = {
  dismissible: true,
  title: "Untitled Modal",
  description: "No description found for this modal.",
};

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const useCurrentModalInfo = (modalIdStack: string[]) => {
  const [modalInfo, setModalInfo] = useState<ModalInfo>(DEFAULT_MODAL_INFO);

  useEffect(() => {
    wait(100).then(() => {
      const currentModal = document.querySelector(`[data-current-modal]`);
      if (!currentModal) {
        setModalInfo(DEFAULT_MODAL_INFO);
        return;
      }

      const title = currentModal.querySelector("[data-modal-title]");
      const description = currentModal.querySelector(
        "[data-modal-description]"
      );
      const dismissible = currentModal.querySelector(
        "[data-modal-dismissible]"
      );

      setModalInfo({
        dismissible:
          dismissible &&
          dismissible.getAttribute("data-modal-dismissible") === "true"
            ? true
            : false,
        title: title?.textContent ?? DEFAULT_MODAL_INFO.title,
        description: description?.textContent ?? DEFAULT_MODAL_INFO.description,
      });
    });
  }, [modalIdStack]);

  return modalInfo;
};

export default useCurrentModalInfo;
