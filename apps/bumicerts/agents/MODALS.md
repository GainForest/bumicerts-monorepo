# Modal Guidelines

## Overview

The app uses a custom stack-based modal system — **not** a plain Radix dialog or
shadcn sheet. It automatically renders as a **Dialog on desktop** and a **Drawer on
mobile** (breakpoint: `32rem`). Multiple modals can be stacked; navigating between
them animates the content in/out.

The system lives in `components/ui/modal/`. You interact with it via:
- `useModal()` hook — for opening, closing, and navigating the stack
- `ModalContent`, `ModalHeader`, `ModalTitle`, `ModalDescription` — for structuring
  the modal's JSX

**Never use a plain Radix `<Dialog>` or shadcn `<Sheet>` directly for app modals.**
Always go through this system.

---

## Opening a Modal

```tsx
"use client";
import { useModal } from "@/components/ui/modal/context";
import { MODAL_IDS } from "@/components/global/modals/ids";
import { MyModal } from "./MyModal";

function SomeTrigger() {
  const { pushModal, show } = useModal();

  const handleOpen = () => {
    pushModal({ id: MODAL_IDS.MY_MODAL, content: <MyModal /> });
    show();
  };

  return <button onClick={handleOpen}>Open</button>;
}
```

**Both `pushModal` and `show` are required.** `pushModal` puts the modal on the stack;
`show` makes the container visible. Calling only one will either show nothing or show
an empty container.

### `replaceAll` — clearing the stack first

`pushModal` accepts a second boolean argument. When `true`, it **clears the entire
stack** before pushing the new modal.

```tsx
pushModal({ id: MODAL_IDS.AUTH, content: <AuthModal /> }, true);
show();
```

**This is the right default when opening a modal from outside another modal.** If the
user has somehow ended up with stale modals in the stack (e.g. navigating around the
app), passing `true` ensures they start fresh rather than seeing a back-navigation
into something unexpected.

Only omit the second argument (or pass `false`) when you are intentionally pushing
onto an existing stack — i.e. you are already inside a modal and want to navigate to
a sub-step (see "Navigating Between Modals" below).

---

## Closing a Modal

Inside a modal component, use `useModal()` to close:

```tsx
const { hide, popModal, stack } = useModal();

const handleClose = async () => {
  if (stack.length === 1) {
    // This is the only modal — hide the container first, then clear the stack
    await hide();
    popModal();
  } else {
    // There are modals beneath this one — just pop, don't hide the container
    popModal();
  }
};
```

- `hide()` — animates the container closed (returns a Promise, await it)
- `popModal()` — removes the top modal from the stack
- `clear()` — removes all modals from the stack (use after `hide()`)

---

## Structuring a Modal Component

A modal component must:
- Be `"use client"`
- Return `<ModalContent>` as its root
- Include `<ModalTitle>` and `<ModalDescription>` for accessibility (use
  `className="sr-only"` if you don't want them visually rendered)

```tsx
"use client";
import { useModal } from "@/components/ui/modal/context";
import {
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
} from "@/components/ui/modal/modal";

export function MyModal() {
  const { hide, popModal, stack } = useModal();

  const handleClose = async () => {
    if (stack.length === 1) {
      await hide();
      popModal();
    } else {
      popModal();
    }
  };

  return (
    <ModalContent dismissible={false}>
      <ModalHeader backAction={stack.length > 1 ? handleClose : undefined}>
        <ModalTitle>Title</ModalTitle>
      </ModalHeader>
      <ModalDescription className="sr-only">
        Brief description for screen readers.
      </ModalDescription>
      {/* modal body */}
    </ModalContent>
  );
}
```

---

## Registering a Modal ID

Every modal needs a unique string ID. All IDs live in one place:

```
components/global/modals/ids.ts
```

Add your ID there before using it:

```ts
export const MODAL_IDS = {
  // ...existing IDs...
  MY_MODAL: "my-modal",
} as const;
```

Then import `MODAL_IDS.MY_MODAL` wherever you open or reference the modal. Never
hardcode the string inline.

---

## Global vs Route-Local Modals

### Put it in `components/global/modals/` if:
- It could reasonably be triggered from more than one place in the app
- It is part of a shared flow (auth, cart, wallet, donate)
- It doesn't depend on props that only exist in one specific route's context

### Co-locate it under `app/.../route/_components/` if:
- It is only ever opened from one specific route
- It requires props that are tightly scoped to that route's data

**If you're unsure, ask the user before placing it.**

---

## Navigating Between Modals (Stacking)

To push a new modal on top of the current one (e.g. a sub-step in a flow), call
`pushModal` without `show()` — the container is already visible:

```tsx
const { pushModal } = useModal();

const goToNextStep = () => {
  pushModal({ id: MODAL_IDS.NEXT_STEP, content: <NextStepModal {...props} /> });
  // No show() — container is already open
};
```

To go back, call `popModal()` — no `hide()` needed since there's still a modal beneath.
