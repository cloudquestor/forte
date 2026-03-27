import config from './config'

function Section({ title, children }) {
  return (
    <section className="space-y-2">
      <h2 className="text-base font-semibold text-gray-800">{title}</h2>
      {children}
      <hr className="border-gray-100 pt-1" />
    </section>
  )
}

function List({ items }) {
  return (
    <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
      {items.map((item, i) => <li key={i}>{item}</li>)}
    </ul>
  )
}

export default function PolicyScreen() {
  return (
    <div className="min-h-screen bg-gray-100 px-4 py-10">
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-2xl mx-auto p-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">{config.appName}</h1>
          <p className="text-lg font-semibold text-gray-700 mt-1">Network Usage Policy</p>
        </div>

        <Section title="1. Introduction">
          <p className="text-sm text-gray-600">
            Welcome to the <strong>Adarsh Palm Retreat Condominium Wi-Fi Network</strong>. This service
            is provided to residents and authorised guests to enable convenient internet access. By
            connecting to this network, you agree to comply with this Usage Policy.
          </p>
        </Section>

        <Section title="2. Acceptable Use">
          <p className="text-sm text-gray-600">You agree to use the network responsibly and legally. Permitted uses include:</p>
          <List items={[
            'Browsing the internet for personal and professional purposes',
            'Accessing email, messaging, and social media',
            'Streaming audio/video within reasonable limits',
            'Work-from-home and educational activities',
          ]} />
        </Section>

        <Section title="3. Prohibited Activities">
          <p className="text-sm text-gray-600">The following activities are strictly prohibited:</p>
          <List items={[
            'Accessing, downloading, or distributing illegal content',
            'Visiting or promoting websites with explicit, harmful, or offensive material',
            'Attempting to hack, scan, or disrupt any network, device, or service',
            'Sharing or distributing malware, viruses, or malicious software',
            'Unauthorised access to other users\' devices or data',
            'Running servers, torrenting, or excessive bandwidth consumption that impacts others',
            'Circumventing security measures (VPNs may be restricted if misused)',
          ]} />
        </Section>

        <Section title="4. Fair Usage Policy">
          <p className="text-sm text-gray-600">To ensure a good experience for all users:</p>
          <List items={[
            'Bandwidth usage may be monitored and limited',
            'Heavy downloads, streaming in ultra-high definition, or continuous large transfers may be throttled',
            'Network speeds may vary based on overall usage',
          ]} />
        </Section>

        <Section title="5. User Authentication & Privacy">
          <List items={[
            'Users are required to authenticate via login credentials',
            'Basic usage logs (such as IP address, device details, and connection metadata) may be collected for security and compliance',
            'The network administrators do not guarantee privacy for transmitted data; use secure websites (HTTPS)',
          ]} />
        </Section>

        <Section title="6. Security">
          <List items={[
            'Users are responsible for securing their own devices',
            'Avoid accessing sensitive information (banking, confidential work) on shared Wi-Fi without proper security measures',
            'The Society is not responsible for any data loss, theft, or damage',
          ]} />
        </Section>

        <Section title="7. Legal Compliance">
          <List items={[
            'Users must comply with all applicable laws and regulations, including IT and cyber laws of India',
            'Activities may be logged and shared with authorities if required by law',
          ]} />
        </Section>

        <Section title="8. Network Availability">
          <List items={[
            'The Wi-Fi service is provided on a best-effort basis',
            'Availability, speed, and uptime are not guaranteed',
            'Maintenance or technical issues may cause temporary disruptions',
          ]} />
        </Section>

        <Section title="9. Enforcement">
          <p className="text-sm text-gray-600">Violations of this policy may result in:</p>
          <List items={[
            'Temporary or permanent suspension of access',
            'Reporting to relevant authorities in case of illegal activities',
          ]} />
        </Section>

        <Section title="10. Disclaimer">
          <p className="text-sm text-gray-600">The Society provides this network as a convenience and makes no warranties regarding:</p>
          <List items={[
            'Speed, reliability, or performance',
            'Protection against cyber threats',
            'Accuracy or safety of internet content',
          ]} />
        </Section>

        <Section title="11. Acceptance of Terms">
          <p className="text-sm text-gray-600">By ticking the acceptance checkbox and signing in, you acknowledge that:</p>
          <List items={[
            'You have read and understood this policy',
            'You agree to comply with all terms and conditions',
          ]} />
        </Section>

        <section className="space-y-1">
          <h2 className="text-base font-semibold text-gray-800">12. Contact Information</h2>
          <p className="text-sm text-gray-600">
            For support or issues, please contact the <strong>Society IT/Admin Team</strong>.
          </p>
        </section>

        <div className="pt-2">
          <a
            href="/"
            className="text-sm text-blue-600 hover:text-blue-800 underline transition-colors"
          >
            ← Back to sign in
          </a>
        </div>
      </div>
    </div>
  )
}
