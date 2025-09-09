import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { User, Building, ArrowRight, CheckCircle2 } from 'lucide-react';

export const DualAuthButtons: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Choose Your Account Type</h2>
        <p className="text-muted-foreground">
          Select the type of account that best describes you
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Client Account */}
        <Link to="/auth?type=client">
          <Card className="hover:shadow-elegant transition-all cursor-pointer group border-2 hover:border-primary/20">
            <CardHeader className="text-center pb-3">
              <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-105 transition-transform">
                <User className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="flex items-center justify-center gap-2">
                I'm a Client
                <Badge variant="secondary">Popular</Badge>
              </CardTitle>
              <CardDescription>
                I need services for my project
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-accent shrink-0" />
                  <span>Post project requirements</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-accent shrink-0" />
                  <span>Get matched with verified professionals</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-accent shrink-0" />
                  <span>Receive competitive quotes</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-accent shrink-0" />
                  <span>Manage project communications</span>
                </div>
              </div>
              
              <Button className="w-full group-hover:bg-primary/90" size="lg">
                Get Started as Client
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        </Link>

        {/* Vendor Account */}
        <Link to="/auth?type=vendor">
          <Card className="hover:shadow-elegant transition-all cursor-pointer group border-2 hover:border-accent/20">
            <CardHeader className="text-center pb-3">
              <div className="w-16 h-16 bg-gradient-to-br from-accent to-accent/80 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-105 transition-transform">
                <Building className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="flex items-center justify-center gap-2">
                I'm a Professional
                <Badge variant="outline" className="border-accent text-accent">Service Provider</Badge>
              </CardTitle>
              <CardDescription>
                I provide services and want to find clients
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-accent shrink-0" />
                  <span>Create professional profile</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-accent shrink-0" />
                  <span>Receive project invitations</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-accent shrink-0" />
                  <span>Submit competitive proposals</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-accent shrink-0" />
                  <span>Grow your client base</span>
                </div>
              </div>
              
              <Button 
                variant="outline" 
                className="w-full group-hover:bg-accent group-hover:text-white border-accent text-accent" 
                size="lg"
              >
                Join as Professional
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        </Link>
      </div>

      <div className="text-center text-sm text-muted-foreground">
        Not sure which account type? You can always change this later in your profile settings.
      </div>
    </div>
  );
};