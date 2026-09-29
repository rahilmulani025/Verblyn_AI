import { TrendingUp, Volume2 } from "lucide-react";

const DashboardPreview = () => {
  const metrics = [
    { label: "Fluency", score: 7.8, color: "bg-accent" },
    { label: "Grammar", score: 6.5, color: "bg-primary" },
    { label: "Pronunciation", score: 7.0, color: "bg-accent" },
    { label: "Confidence", score: 7.2, color: "bg-primary" },
  ];

  return (
    <section className="py-24 relative overflow-hidden">
      {/* Background elements */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
      
      <div className="container mx-auto px-6 relative">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">
            Instant <span className="text-gradient">Feedback</span>
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Get detailed insights after every practice session
          </p>
        </div>
        
        <div className="max-w-4xl mx-auto">
          <div className="glass-card p-8 md:p-10">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                  <Volume2 className="w-5 h-5 text-foreground" />
                </div>
                <div>
                  <h3 className="font-display font-semibold text-foreground">Session Analysis</h3>
                  <p className="text-sm text-muted-foreground">Interview Practice - 5 min</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-accent">
                <TrendingUp className="w-4 h-4" />
                <span className="text-sm font-medium">+12% this week</span>
              </div>
            </div>
            
            {/* Score cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {metrics.map((metric, index) => (
                <div key={index} className="bg-secondary/50 rounded-xl p-4 text-center">
                  <div className="text-3xl font-display font-bold text-foreground mb-1">
                    {metric.score}
                  </div>
                  <div className="text-sm text-muted-foreground">{metric.label}</div>
                  <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${metric.color} rounded-full transition-all duration-1000`}
                      style={{ width: `${metric.score * 10}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
            
            {/* Progress chart mockup */}
            <div className="bg-secondary/30 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-muted-foreground">Confidence Progress</span>
                <span className="text-sm text-accent">Last 7 days</span>
              </div>
              <div className="h-32 flex items-end justify-between gap-2">
                {[40, 55, 45, 65, 60, 75, 72].map((height, index) => (
                  <div key={index} className="flex-1 flex flex-col items-center gap-2">
                    <div 
                      className="w-full bg-gradient-to-t from-primary to-accent rounded-t-md transition-all duration-500 hover:opacity-80"
                      style={{ height: `${height}%` }}
                    />
                    <span className="text-xs text-muted-foreground">
                      {['M', 'T', 'W', 'T', 'F', 'S', 'S'][index]}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default DashboardPreview;
