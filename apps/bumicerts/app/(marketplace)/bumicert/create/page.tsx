import React from "react";
import AuthWrapper from "./[draftId]/_components/AuthWrapper";
import {
  ChartPieIcon,
  HelpCircleIcon,
  LeafIcon,
} from "lucide-react";
import GetStartedButton from "./_components/GetStartedButton";
import Image from "next/image";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import MyBumicerts from "./_components/MyBumicerts";
import DraftBumicerts from "./_components/DraftBumicerts";

const CreateBumicertPage = () => {
  return (
    <AuthWrapper>
      <div className="w-full grid grid-cols-1 lg:grid-cols-[1fr_20rem] gap-6 mt-4">
        <div className="flex-1 flex flex-col gap-4">
          {/* Create New Section */}
          <section className="rounded-xl gap-1 border border-border shadow-xl relative overflow-hidden">
            <Image
              src="/assets/media/images/jeremy-bishop-vGjGvtSfys4-unsplash.jpg"
              alt="Create Bumicert"
              fill
              className="object-cover object-[50%_40%]"
            />
            <div className="relative inset-0 flex flex-col p-4 gap-2 bg-linear-to-b from-black/60 via-black/20 to-black/0">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center">
                  <LeafIcon className="size-4 text-white" />
                </div>
                <h1 className="text-2xl font-bold font-serif text-white">
                  Start a new application
                </h1>
              </div>
              <p className="text-gray-200">
                Start a new application to create a bumicert for the
                organization, and showcase your commitment to sustainability.
              </p>
              <div className="flex items-center justify-end mt-20">
                <GetStartedButton />
              </div>
            </div>
          </section>

          {/* My Bumicerts Section */}
          <MyBumicerts />
        </div>
        <div className="w-full">
          <Accordion type="multiple" defaultValue={["item-2"]}>
            <AccordionItem value="item-1">
              <AccordionTrigger>
                <div className="flex items-center gap-2">
                  <HelpCircleIcon className="size-4 opacity-50" />
                  What is a Bumicert?
                </div>
              </AccordionTrigger>
              <AccordionContent>
                A Bumicert is a certificate that records the creation of a
                specific environmental action by a community, giving it a
                permanent digital identity.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-2">
              <AccordionTrigger>
                <div className="flex items-center gap-2">
                  <ChartPieIcon className="size-4 opacity-50" />
                  Pending Applications
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <DraftBumicerts />
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </div>
    </AuthWrapper>
  );
};

export default CreateBumicertPage;
