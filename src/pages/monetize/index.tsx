/**
 * Page map for this area: route id → component.
 * Monetize (12 tabs + inferred create/edit flows) and public commerce pages. See NOTES.md.
 */
import type { PageMap, PageProps } from "../types";
import { SubscriptionsTab } from "./tabs/Subscriptions";
import { NewslettersTab } from "./tabs/Newsletters";
import { MerchandiseTab, NftsTab, SimpleProductTab } from "./tabs/Products";
import { EventsTab } from "./tabs/Events";
import { VipOffersTab } from "./tabs/VipOffers";
import { DiscountCodesTab, PortfoliosTab } from "./tabs/PortfoliosCodes";
import { AdsTab } from "./tabs/Ads";
import { PlanFormPage, SubscribersPage } from "./forms/PlanForm";
import { NewsletterFormPage, RecipientsPage } from "./forms/NewsletterForm";
import { ProductFormPage } from "./forms/ProductForm";
import { EventFormPage, ManageTicketsPage } from "./forms/EventForm";
import { VipFormPage } from "./forms/VipForm";
import { PublicEventDetailPage, PublicEventsPage } from "./public/PublicEvents";
import { PublicVideoSeriesPage, PublicVideosPage } from "./public/PublicVideos";
import { PublicBookingPage, PublicProductPage, PublicStorePage } from "./public/PublicStore";
import { PublicNewslettersPage, PublicVipDealPage, PublicVipDealsPage } from "./public/PublicExtras";

const Experiences = (p: PageProps) => <SimpleProductTab {...p} kind="experience" />;
const Courses = (p: PageProps) => <SimpleProductTab {...p} kind="course" />;
const Downloadables = (p: PageProps) => <SimpleProductTab {...p} kind="downloadable" />;
/** /monetize redirects to Subscriptions (route.redirect); this renders only for a frame. */
const MonetizeRoot = SubscriptionsTab;

export const pages: PageMap = {
  "monetize": MonetizeRoot,
  "monetize-subscription": SubscriptionsTab,
  "monetize-newsletters": NewslettersTab,
  "monetize-experience": Experiences,
  "monetize-courses": Courses,
  "monetize-downloadable": Downloadables,
  "monetize-merchandise": MerchandiseTab,
  "monetize-nfts": NftsTab,
  "monetize-event-calendar": EventsTab,
  "monetize-vip-offers": VipOffersTab,
  "monetize-portfolio": PortfoliosTab,
  "monetize-discount-codes": DiscountCodesTab,
  "monetize-advertisements": AdsTab,
  /* inferred create / edit flows */
  "monetize-plan-add": PlanFormPage,
  "monetize-plan-edit": PlanFormPage,
  "monetize-subscribers": SubscribersPage,
  "monetize-newsletter-new": NewsletterFormPage,
  "monetize-newsletter-edit": NewsletterFormPage,
  "monetize-newsletter-recipients": RecipientsPage,
  "monetize-experience-add": ProductFormPage,
  "monetize-experience-edit": ProductFormPage,
  "monetize-course-add": ProductFormPage,
  "monetize-course-edit": ProductFormPage,
  "monetize-downloadable-add": ProductFormPage,
  "monetize-downloadable-edit": ProductFormPage,
  "monetize-merch-add": ProductFormPage,
  "monetize-merch-edit": ProductFormPage,
  "monetize-nft-add": ProductFormPage,
  "monetize-nft-edit": ProductFormPage,
  "monetize-event-add": EventFormPage,
  "monetize-event-edit": EventFormPage,
  "monetize-event-tickets": ManageTicketsPage,
  "monetize-vip-add": VipFormPage,
  "monetize-vip-edit": VipFormPage,
  /* public */
  "public-events": PublicEventsPage,
  "public-event-detail": PublicEventDetailPage,
  "public-videos": PublicVideosPage,
  "public-video-series": PublicVideoSeriesPage,
  "public-store": PublicStorePage,
  "public-product": PublicProductPage,
  "public-booking": PublicBookingPage,
  "public-newsletters": PublicNewslettersPage,
  "public-vip-deals": PublicVipDealsPage,
  "public-vip-deal": PublicVipDealPage,
};
