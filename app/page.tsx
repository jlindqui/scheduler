import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <header className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            CBA Scheduling System
          </h1>
          <p className="text-xl text-gray-700 mb-6">
            Intelligent workforce scheduling for organizations with Collective Bargaining Agreements
          </p>
          <Link
            href="/demo"
            className="inline-block bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            View Live Demo →
          </Link>
        </header>

        {/* Status Badge */}
        <div className="bg-yellow-100 border border-yellow-400 rounded-lg p-4 mb-8 text-center">
          <p className="text-yellow-800 font-semibold">
            🚧 Running in Demo Mode (No Database Connected)
          </p>
          <p className="text-yellow-700 text-sm mt-1">
            Connect a database to enable full functionality
          </p>
        </div>

        {/* Feature Cards */}
        <div className="grid md:grid-cols-2 gap-6 mb-12">
          {/* Staff Features */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold text-blue-600 mb-4">For Staff</h2>
            <ul className="space-y-3">
              <li className="flex items-start">
                <span className="text-2xl mr-3">🤖</span>
                <div>
                  <strong>AI Chat Agent</strong>
                  <p className="text-gray-600 text-sm">Conversational interface for all scheduling needs</p>
                </div>
              </li>
              <li className="flex items-start">
                <span className="text-2xl mr-3">📋</span>
                <div>
                  <strong>Availability Management</strong>
                  <p className="text-gray-600 text-sm">Submit availability with CBA validation</p>
                </div>
              </li>
              <li className="flex items-start">
                <span className="text-2xl mr-3">🔄</span>
                <div>
                  <strong>Shift Swaps</strong>
                  <p className="text-gray-600 text-sm">AI-suggested swap partners based on compatibility</p>
                </div>
              </li>
              <li className="flex items-start">
                <span className="text-2xl mr-3">🏖️</span>
                <div>
                  <strong>Time Off Requests</strong>
                  <p className="text-gray-600 text-sm">Smart bank selection to avoid expiry</p>
                </div>
              </li>
            </ul>
          </div>

          {/* Manager Features */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold text-green-600 mb-4">For Managers</h2>
            <ul className="space-y-3">
              <li className="flex items-start">
                <span className="text-2xl mr-3">📈</span>
                <div>
                  <strong>Schedule Optimization</strong>
                  <p className="text-gray-600 text-sm">AI-generated schedule drafts with multiple options</p>
                </div>
              </li>
              <li className="flex items-start">
                <span className="text-2xl mr-3">🎯</span>
                <div>
                  <strong>Staffing Analysis</strong>
                  <p className="text-gray-600 text-sm">Real-time view of staffing levels and costs</p>
                </div>
              </li>
              <li className="flex items-start">
                <span className="text-2xl mr-3">✅</span>
                <div>
                  <strong>Approval Workflows</strong>
                  <p className="text-gray-600 text-sm">Easy approval of swaps and time-off requests</p>
                </div>
              </li>
              <li className="flex items-start">
                <span className="text-2xl mr-3">📉</span>
                <div>
                  <strong>Risk Detection</strong>
                  <p className="text-gray-600 text-sm">Identify OT triggers and rule violations</p>
                </div>
              </li>
            </ul>
          </div>
        </div>

        {/* Core Capabilities */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-12">
          <h2 className="text-2xl font-bold text-purple-600 mb-4">Core Capabilities</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="border border-gray-200 rounded p-4">
              <div className="text-3xl mb-2">📜</div>
              <strong className="block mb-1">CBA Compliance</strong>
              <p className="text-gray-600 text-sm">Rules engine enforces overtime, premiums, rest periods</p>
            </div>
            <div className="border border-gray-200 rounded p-4">
              <div className="text-3xl mb-2">💰</div>
              <strong className="block mb-1">Time Off Banks</strong>
              <p className="text-gray-600 text-sm">Track vacation, stat days, with expiry warnings</p>
            </div>
            <div className="border border-gray-200 rounded p-4">
              <div className="text-3xl mb-2">🎓</div>
              <strong className="block mb-1">Skills Management</strong>
              <p className="text-gray-600 text-sm">Match shifts to staff skills and certifications</p>
            </div>
          </div>
        </div>

        {/* Sample Scenario */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg shadow-lg p-6 text-white">
          <h2 className="text-2xl font-bold mb-4">Example Scenario: Shift Swap Request</h2>
          <div className="bg-white/10 rounded-lg p-4 mb-4">
            <p className="font-semibold mb-2">Staff: "I want Thursday off, who can I swap with?"</p>
            <ol className="list-decimal list-inside space-y-2 text-sm">
              <li>Agent verifies availability is up-to-date</li>
              <li>Agent checks schedule for compatible swap candidates</li>
              <li>Agent presents options with compatibility scores</li>
              <li>Staff selects preferred swap partner</li>
              <li>Agent submits request for manager approval</li>
              <li>Request reflected in schedule upon approval</li>
            </ol>
          </div>
          <p className="text-sm italic">All powered by AI that understands your CBA rules!</p>
        </div>

        {/* Tech Stack */}
        <div className="mt-12 text-center">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">Built With</h3>
          <div className="flex flex-wrap justify-center gap-4 text-sm text-gray-600">
            <span className="bg-white px-4 py-2 rounded-full shadow">Next.js 15</span>
            <span className="bg-white px-4 py-2 rounded-full shadow">React 19</span>
            <span className="bg-white px-4 py-2 rounded-full shadow">TypeScript</span>
            <span className="bg-white px-4 py-2 rounded-full shadow">Prisma ORM</span>
            <span className="bg-white px-4 py-2 rounded-full shadow">PostgreSQL</span>
            <span className="bg-white px-4 py-2 rounded-full shadow">Tailwind CSS</span>
          </div>
        </div>
      </div>
    </div>
  );
}
