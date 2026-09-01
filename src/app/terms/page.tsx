import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The terms that govern use of City2Ranch's website and service.",
};

export default function TermsPage() {
  return (
    <Container className="flex flex-col gap-10 py-16 sm:py-24">
      <SectionHeading eyebrow="LEGAL" title="Terms of Service" />

      <div className="flex max-w-2xl flex-col gap-6 font-sans text-sm leading-relaxed text-charcoal/80 sm:text-base">
        <p className="text-charcoal/60">
          Last updated: this page is a working draft and will be reviewed by
          legal counsel before City2Ranch launches publicly. It has not yet
          been reviewed by an attorney, and no part of it — including
          Section&nbsp;33 (Dispute Resolution) — should be treated as final
          until that review is complete.
        </p>

        <section className="flex flex-col gap-2">
          <h2 className="font-serif text-xl text-navy-deep">1. About This Agreement</h2>
          <p>
            Welcome to City2Ranch. These Terms of Service (&quot;Terms&quot;) govern your
            access to and use of the City2Ranch website, customer account,
            driver account, and related services (together, the
            &quot;Platform&quot;).
          </p>
          <p>
            City2Ranch is a private rural concierge and delivery service. We
            pick up orders you&apos;ve already placed with a supported store
            (&quot;City Pickup&quot;), or shop and deliver on your behalf from a
            list you provide (&quot;Concierge&quot;). Service is provided by
            appointment, on scheduled routes, in select rural areas — we are
            still establishing our service area and do not yet serve every
            location.
          </p>
          <p>
            By creating an account, submitting a request, or using the
            Platform, you agree to be bound by these Terms. If you do not
            agree, please do not use the Platform.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-serif text-xl text-navy-deep">2. Definitions</h2>
          <ul className="list-disc flex flex-col gap-1.5 pl-5">
            <li>
              <strong>&quot;City2Ranch,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;</strong> means
              City2Ranch and its authorized staff, drivers, and contractors.
            </li>
            <li>
              <strong>&quot;Customer,&quot; &quot;you,&quot; or &quot;your&quot;</strong> means a person who
              creates an account, submits a request, or receives service
              through the Platform.
            </li>
            <li>
              <strong>&quot;Driver&quot;</strong> means an individual authorized by
              City2Ranch to pick up and deliver orders.
            </li>
            <li>
              <strong>&quot;Order&quot; or &quot;Service Request&quot;</strong> means a City Pickup
              or Concierge request submitted through the Platform.
            </li>
            <li>
              <strong>&quot;Service&quot; or &quot;Delivery&quot;</strong> means the pickup, shopping,
              or delivery performed for an accepted Order.
            </li>
          </ul>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-serif text-xl text-navy-deep">3. Eligibility</h2>
          <p>You may use City2Ranch only if you:</p>
          <ul className="list-disc flex flex-col gap-1.5 pl-5">
            <li>are legally capable of entering into a binding agreement;</li>
            <li>provide accurate account and delivery information;</li>
            <li>comply with applicable federal, state, and local law; and</li>
            <li>comply with these Terms.</li>
          </ul>
          <p>
            Individuals under 18 may not create or independently operate an
            account. A parent, legal guardian, or household member with
            appropriate permissions (see Section&nbsp;4) may submit a request
            on another person&apos;s behalf.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-serif text-xl text-navy-deep">4. Account Registration &amp; Household Access</h2>
          <p>
            Certain features require an account, created by signing in with
            your email address. You&apos;re responsible for keeping your
            sign-in access secure and for activity that occurs through your
            account.
          </p>
          <p>
            City2Ranch supports adding other people to your household account
            with a role — full access, ordering only, or view only. You are
            responsible for the actions any household member you&apos;ve added
            takes on your account, consistent with the role you&apos;ve given
            them.
          </p>
          <p>
            You may not create an account using another person&apos;s
            identity, provide false identification, or attempt to bypass any
            verification step.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-serif text-xl text-navy-deep">5. Accuracy of Information</h2>
          <p>
            You&apos;re responsible for the accuracy of information needed to
            complete your Order, including your name, phone number, delivery
            address, gate code or property access instructions, shopping
            list or store order number, and any special delivery
            instructions.
          </p>
          <p>
            Materially inaccurate information — an address we can&apos;t
            locate, a gate code that doesn&apos;t work, an order number that
            doesn&apos;t match — may delay your Service, result in additional
            charges, or result in the Order being cancelled.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-serif text-xl text-navy-deep">6. Service Requests &amp; Orders</h2>
          <p>
            Submitting a request does not guarantee service. A City Pickup
            Order is confirmed once priced and paid for; a Concierge request
            is confirmed once our team provides a quote and you approve and
            pay for it.
          </p>
          <p>
            City2Ranch may decline, delay, or cancel an Order for reasons
            including: your address falls outside our current service area;
            the requested store or item isn&apos;t available; incorrect or
            incomplete information; weather or road conditions; a driver
            isn&apos;t available for your route; suspected fraud; or a
            payment problem.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-serif text-xl text-navy-deep">7. Pickup, Shopping &amp; Delivery</h2>
          <p>
            For a City Pickup Order, you&apos;re responsible for having
            already placed a real order with the store and providing an
            accurate order/confirmation number. For a Concierge Order, our
            team shops from the list and instructions you provide, and may
            contact you if an item is unavailable or a substitution is
            needed.
          </p>
          <p>
            You&apos;re responsible for providing a delivery address a
            vehicle can safely reach, along with any gate code, dropoff
            location, or access notes we&apos;d need. A driver isn&apos;t
            required to enter a location that&apos;s unsafe, inaccessible, or
            that a property owner hasn&apos;t authorized.
          </p>
          <p>
            Most deliveries are confirmed with a one-time delivery PIN, given
            to your driver at the door, so we can confirm the delivery
            reached the right person.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-serif text-xl text-navy-deep">8. Fees, Pricing &amp; Estimates</h2>
          <p>
            City Pickup pricing is calculated automatically from a base fee
            plus distance and shown to you before you pay — nothing is
            charged until you approve it. Concierge pricing is built by our
            team as an itemized quote, which you review and approve before
            any payment is taken.
          </p>
          <p>
            Additional charges may apply where disclosed in advance, such as
            for a substituted or added item. City2Ranch will not add an
            undisclosed charge to an Order you&apos;ve already approved.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-serif text-xl text-navy-deep">9. Payments</h2>
          <p>
            Payments are processed through our payment provider (Stripe).
            City2Ranch does not store your full card details. Your payment
            may be subject to standard authorization and fraud checks. If a
            payment fails, we may ask for another payment method or cancel
            the affected Order.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-serif text-xl text-navy-deep">10. Cancellations &amp; Order Changes</h2>
          <p>
            You may cancel a request that hasn&apos;t yet been paid for at
            any time. Once an Order is paid and a driver has been dispatched,
            cancelling may not be possible, or may only be possible through
            our support team. Changing an Order&apos;s items, address, or
            timing after it&apos;s been placed is subject to availability and
            may change the price.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-serif text-xl text-navy-deep">11. Missed Deliveries</h2>
          <p>
            If a driver arrives at your delivery address, reasonably attempts
            to reach you, and cannot complete the delivery — nobody&apos;s
            available to receive it, the delivery PIN can&apos;t be
            confirmed, or the property can&apos;t be safely accessed — the
            delivery may be held, rescheduled, or returned, and additional
            charges may apply. Please make sure someone is reasonably
            reachable around your requested delivery window.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-serif text-xl text-navy-deep">12. Driver Relationship</h2>
          <p>
            Drivers are independent contractors or authorized service
            providers, not employees of City2Ranch, unless a separate written
            agreement says otherwise. Nothing in these Terms creates an
            employment, partnership, or agency relationship between
            City2Ranch and a Driver toward you.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-serif text-xl text-navy-deep">13. Safety &amp; Property Access</h2>
          <p>
            You&apos;re responsible for making sure the pickup and delivery
            locations you provide are safe and legally accessible to a
            driver. A driver may decline or discontinue a delivery to protect
            their own safety, your property, or the public, and may refuse
            service to anyone whose conduct is threatening or unsafe.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-serif text-xl text-navy-deep">14. Emergencies</h2>
          <p>
            City2Ranch is not an emergency service. If you have a medical,
            fire, police, or other life-threatening emergency, contact 911 or
            the appropriate local authority directly.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-serif text-xl text-navy-deep">15. Prohibited Items &amp; Conduct</h2>
          <p>You may not request that City2Ranch purchase, pick up, or deliver:</p>
          <ul className="list-disc flex flex-col gap-1.5 pl-5">
            <li>illegal drugs or controlled substances;</li>
            <li>firearms, ammunition, or explosives;</li>
            <li>stolen property; or</li>
            <li>any other item unlawful to possess, sell, or transport.</li>
          </ul>
          <p>
            You may not threaten, harass, or behave abusively toward a driver
            or staff member, attempt to defraud City2Ranch, or attempt to
            manipulate pricing, coverage, or account systems. We may refuse
            service and, where appropriate, involve law enforcement.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-serif text-xl text-navy-deep">16. Age-Restricted &amp; Regulated Goods</h2>
          <p>
            City2Ranch does not commit to sourcing, purchasing, or delivering
            alcohol, tobacco, or other items that require special age
            verification or regulatory licensing. Any such request is
            evaluated case by case and may be declined. Where we do fulfill
            an age-restricted item, a driver may require ID verification at
            delivery and may decline delivery if it can&apos;t reasonably be
            confirmed.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-serif text-xl text-navy-deep">17. Accessibility</h2>
          <p>
            If you have an accessibility need that affects how your delivery
            should be handled — where it&apos;s left, how it&apos;s
            announced, or anything else — let us know when you submit your
            request so our team and driver can accommodate it. We will not
            knowingly discriminate against a customer on a basis prohibited
            by applicable law.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-serif text-xl text-navy-deep">18. Missing, Damaged, or Incorrect Items</h2>
          <p>
            For a Concierge Order, if an item you requested is unavailable,
            our team will attempt to reach you about a substitution before
            completing your order. For a City Pickup Order, the order itself
            was placed directly with the store — City2Ranch is responsible
            for picking it up and delivering it safely, but is not
            responsible for an error the store made in fulfilling your
            original order.
          </p>
          <p>
            Please report any item that arrives damaged, missing, or
            incorrect as soon as possible through our{" "}
            <a href="/contact" className="text-navy-deep underline hover:text-gold">
              contact page
            </a>
            {" "}so we can look into it.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-serif text-xl text-navy-deep">19. Communications</h2>
          <p>
            City2Ranch communicates with customers by email, and may in the
            future add text messages, push notifications, or in-app alerts.
            These may include order confirmations, quote and delivery
            updates, payment receipts, and account or security notices.
            Transactional messages like these may continue even if you opt
            out of marketing communications.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-serif text-xl text-navy-deep">20. User Content</h2>
          <p>
            If you send us messages, photos, or other content — for example,
            through an order&apos;s message thread — you keep ownership of
            it, and give City2Ranch permission to use, store, and display it
            as needed to provide and support the service.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-serif text-xl text-navy-deep">21. Intellectual Property</h2>
          <p>
            The City2Ranch website, branding, and software are owned by or
            licensed to City2Ranch. You may not copy, reverse engineer,
            scrape, or commercially exploit the Platform without our written
            permission.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-serif text-xl text-navy-deep">22. Fraud &amp; Account Abuse</h2>
          <p>
            We may investigate and act on suspected fraud or abuse —
            including a false or stolen payment method, a fake or duplicate
            account, false address or coverage information, or an attempt to
            manipulate pricing or dispatch. We may suspend an account, cancel
            an affected Order, and where legally required, cooperate with law
            enforcement.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-serif text-xl text-navy-deep">23. Suspension &amp; Termination</h2>
          <p>
            We may suspend or close an account for violating these Terms,
            fraud, abuse toward a driver or staff member, repeated payment
            problems, or other conduct that puts people or the service at
            risk. Closing an account doesn&apos;t cancel any obligation —
            like an unpaid balance — that already existed.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-serif text-xl text-navy-deep">24. Privacy</h2>
          <p>
            Our collection and use of your information is described in our{" "}
            <a href="/privacy" className="text-navy-deep underline hover:text-gold">
              Privacy Policy
            </a>
            , which is part of this Agreement.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-serif text-xl text-navy-deep">25. Third-Party Services</h2>
          <p>
            We rely on third-party providers for functions like payment
            processing, email delivery, and hosting. Those providers have
            their own terms and privacy practices, and City2Ranch isn&apos;t
            responsible for a failure of an independent third-party service
            except where the law requires otherwise.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-serif text-xl text-navy-deep">26. Platform &amp; Service Availability</h2>
          <p>
            We aim for reliable service but don&apos;t guarantee the Platform
            will always be available, or that a driver, store, or route will
            always be available for your area — availability depends on
            demand, weather, staffing, and where our routes currently reach.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-serif text-xl text-navy-deep">27. Limitation of Liability</h2>
          <p>
            To the fullest extent permitted by law, City2Ranch is not liable
            for indirect, incidental, or consequential damages arising from
            use of the Platform or Service. Nothing here limits a right or
            remedy that applicable consumer-protection law guarantees you.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-serif text-xl text-navy-deep">28. Indemnification</h2>
          <p>
            To the extent permitted by law, you agree to hold City2Ranch
            harmless from claims arising out of your violation of these
            Terms, unlawful conduct, or fraud.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-serif text-xl text-navy-deep">29. Dispute Resolution</h2>
          <p>
            If you have a concern, please contact our support team first so
            we can try to resolve it directly. This section does not include
            a mandatory arbitration or class-action-waiver clause — if
            City2Ranch adopts one in the future, it will only be added after
            review by Texas counsel, and this page will be updated to say so
            clearly before it takes effect.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-serif text-xl text-navy-deep">30. Governing Law</h2>
          <p>
            Unless applicable law requires otherwise, these Terms are
            governed by the laws of the State of Texas.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-serif text-xl text-navy-deep">31. Changes to These Terms</h2>
          <p>
            We may update these terms as City2Ranch&apos;s service area and
            offerings evolve. Continued use of this website after changes
            constitutes acceptance of the updated terms.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-serif text-xl text-navy-deep">32. Severability</h2>
          <p>
            If any part of these Terms is found unenforceable, the rest
            remains in effect.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-serif text-xl text-navy-deep">33. Entire Agreement</h2>
          <p>
            These Terms, together with our Privacy Policy, make up the whole
            agreement governing your use of City2Ranch.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-serif text-xl text-navy-deep">34. Contact</h2>
          <p>
            Questions about these terms can be sent through our{" "}
            <a href="/contact" className="text-navy-deep underline hover:text-gold">
              contact page
            </a>
            .
          </p>
        </section>
      </div>
    </Container>
  );
}
