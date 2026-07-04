import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Briefcase, FileText, CheckCircle, TrendingUp } from "lucide-react";

export function Features() {
  const features = [
    {
      title: "Application Board",
      description: "Track all your internship and job applications in a seamless Kanban board layout.",
      icon: <Briefcase className="h-6 w-6 text-blue-500" />,
    },
    {
      title: "AI Resume Analysis",
      description: "Get actionable feedback on your resume to increase your chances of passing ATS screens.",
      icon: <FileText className="h-6 w-6 text-purple-500" />,
    },
    {
      title: "Task Management",
      description: "Set reminders for follow-ups, interviews, and deadlines so you never miss an opportunity.",
      icon: <CheckCircle className="h-6 w-6 text-green-500" />,
    },
    {
      title: "Career Analytics",
      description: "View your success rates, application volume, and get insights into your job hunt performance.",
      icon: <TrendingUp className="h-6 w-6 text-orange-500" />,
    },
  ];

  return (
    <section id="features" className="py-24 bg-gray-950 text-white w-full">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 tracking-tight">Everything you need to land your dream role</h2>
          <p className="text-gray-400 text-lg">
            CareerTrack provides the tools to manage your entire job search journey from application to offer.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, idx) => (
            <Card key={idx} className="bg-gray-900 border-gray-800 hover:border-gray-700 transition-colors">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-gray-800 flex items-center justify-center mb-4">
                  {feature.icon}
                </div>
                <CardTitle className="text-xl text-white">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-gray-400 text-base">
                  {feature.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
