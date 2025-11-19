'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { GenerationType } from '@/lib/types';
import { PollinationsModel, AVAILABLE_MODELS } from '@/lib/free-ai-api';
import { Sparkles, Zap, Palette, Image as ImageIcon, Video, Type, ArrowRight } from 'lucide-react';

const formSchema = z.object({
  prompt: z.string().min(1, { message: 'Prompt is required' }).max(1000, { message: 'Prompt must be less than 1000 characters' }),
  type: z.enum(['text_to_prompt', 'image', 'video', 'image_free'] as const, {
    required_error: 'Please select a generation type',
  }),
  model: z.enum(['flux', 'stability-ai', 'turbo'] as const).optional(),
});

interface PromptFormProps {
  onGenerate: (prompt: string, type: GenerationType, model?: PollinationsModel) => void;
  isGenerating: boolean;
}

export function PromptForm({ onGenerate, isGenerating }: PromptFormProps) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      prompt: '',
      type: 'image_free', // Default to free image generation
      model: 'flux', // Default model - high quality
    },
  });

  const selectedType = useWatch({
    control: form.control,
    name: 'type',
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    onGenerate(values.prompt, values.type, values.model);
  }

  const getGenerationTypeInfo = (type: string) => {
    switch (type) {
      case 'text_to_prompt':
        return { icon: Type, color: 'text-blue-500', title: 'Text Enhancement' };
      case 'image':
        return { icon: ImageIcon, color: 'text-purple-500', title: 'Image (Premium)' };
      case 'image_free':
        return { icon: Palette, color: 'text-green-500', title: 'Image (Free)' };
      case 'video':
        return { icon: Video, color: 'text-orange-500', title: 'Video Generation' };
      default:
        return { icon: Sparkles, color: 'text-gray-500', title: 'Generate Content' };
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Create Amazing UGC Content
          </h2>
          <p className="text-muted-foreground">
            Transform your ideas into stunning user-generated content with AI
          </p>
        </div>

        {/* Prompt Input */}
        <div className="space-y-2">
          <FormField
            control={form.control}
            name="prompt"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-base font-medium flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  Your Creative Prompt
                </FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Describe what you want to create... Be creative and specific! 🎨"
                    className="min-h-[120px] resize-none border-2 focus:border-primary transition-colors"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Generation Type Selection */}
        <div className="space-y-3">
          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-base font-medium">Choose Generation Type</FormLabel>
                <FormControl>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <SelectTrigger className="h-12">
                      <SelectValue placeholder="Select what you want to create" />
                    </SelectTrigger>
                    <SelectContent className="max-h-80">
                      <SelectItem value="text_to_prompt">
                        <div className="flex items-center gap-3 p-2">
                          <Type className="w-5 h-5 text-blue-500" />
                          <div>
                            <div className="font-medium">Text Enhancement</div>
                            <div className="text-xs text-muted-foreground">Improve your text content</div>
                          </div>
                        </div>
                      </SelectItem>

                      <SelectItem value="image">
                        <div className="flex items-center gap-3 p-2">
                          <ImageIcon className="w-5 h-5 text-purple-500" />
                          <div className="flex-1">
                            <div className="font-medium flex items-center gap-2">
                              Image Generation
                              <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                                Premium
                              </Badge>
                            </div>
                            <div className="text-xs text-muted-foreground">High-quality AI images</div>
                          </div>
                        </div>
                      </SelectItem>

                      <SelectItem value="image_free">
                        <div className="flex items-center gap-3 p-2">
                          <Palette className="w-5 h-5 text-green-500" />
                          <div className="flex-1">
                            <div className="font-medium flex items-center gap-2">
                              Image Generation
                              <Badge variant="secondary" className="text-xs bg-green-100 text-green-700 border-green-200">
                                FREE
                              </Badge>
                            </div>
                            <div className="text-xs text-muted-foreground">Instant results, multiple models</div>
                          </div>
                        </div>
                      </SelectItem>

                      <SelectItem value="video">
                        <div className="flex items-center gap-3 p-2">
                          <Video className="w-5 h-5 text-orange-500" />
                          <div>
                            <div className="font-medium">Video Generation</div>
                            <div className="text-xs text-muted-foreground">Create stunning videos</div>
                          </div>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* AI Model Selection - Only for Free Image Generation */}
        {selectedType === 'image_free' && (
          <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
            <FormField
              control={form.control}
              name="model"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base font-medium flex items-center gap-2">
                    <Zap className="w-4 h-4" />
                    Choose Your AI Model
                    <span className="text-sm font-normal text-muted-foreground ml-2">
                      Select the perfect model for your creative vision
                    </span>
                  </FormLabel>
                  <FormControl>
                    {/* Model Cards Selection */}
                    <div className="grid grid-cols-1 gap-3 mt-3">
                      {Object.entries(AVAILABLE_MODELS).map(([key, model]) => (
                        <div
                          key={key}
                          onClick={() => field.onChange(key)}
                          className={`
                            relative p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 hover:shadow-lg
                            ${field.value === key
                              ? 'border-primary bg-primary/5 shadow-md ring-2 ring-primary/20 transform scale-[1.02]'
                              : 'border-muted hover:border-primary/60 hover:bg-gradient-to-r hover:from-primary/5 hover:to-primary/10'
                            }
                          `}
                        >
                          {field.value === key && (
                            <div className="absolute top-2 right-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                              <div className="w-3 h-3 bg-white rounded-full"></div>
                            </div>
                          )}

                          <div className="flex items-start gap-4">
                            {/* Model Icon */}
                            <div className={`
                              w-12 h-12 rounded-lg flex items-center justify-center
                              ${key === 'flux' ? 'bg-gradient-to-br from-blue-500 to-purple-500' :
                                key === 'stability-ai' ? 'bg-gradient-to-br from-purple-500 to-pink-500' :
                                'bg-gradient-to-br from-green-500 to-emerald-500'}
                            `}>
                              {key === 'flux' ? (
                                <Palette className="w-6 h-6 text-white" />
                              ) : key === 'stability-ai' ? (
                                <ImageIcon className="w-6 h-6 text-white" />
                              ) : (
                                <Zap className="w-6 h-6 text-white" />
                              )}
                            </div>

                            {/* Model Info */}
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-semibold text-lg">{model.name}</h3>
                                {key === 'flux' && (
                                  <Badge className="text-xs bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200">
                                    ⭐ Best Quality
                                  </Badge>
                                )}
                                {key === 'stability-ai' && (
                                  <Badge variant="outline" className="text-xs">
                                    🎨 Artistic
                                  </Badge>
                                )}
                                {key === 'turbo' && (
                                  <Badge variant="secondary" className="text-xs">
                                    ⚡ Super Fast
                                  </Badge>
                                )}
                              </div>

                              <p className="text-sm text-muted-foreground mb-2">
                                {model.description}
                              </p>

                              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                <div className="flex items-center gap-1">
                                  <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                                  <span>Free</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                                  <span>Instant</span>
                                </div>
                                <div className="px-2 py-0.5 bg-muted rounded">
                                  {model.style}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Sample Preview Hint */}
                          <div className="mt-3 pt-3 border-t">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              {key === 'flux' && (
                                <>
                                  <div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div>
                                  <span>Perfect for: Realistic photos, portraits, landscapes</span>
                                </>
                              )}
                              {key === 'stability-ai' && (
                                <>
                                  <div className="w-1.5 h-1.5 rounded-full bg-purple-400"></div>
                                  <span>Perfect for: Artistic scenes, creative concepts</span>
                                </>
                              )}
                              {key === 'turbo' && (
                                <>
                                  <div className="w-1.5 h-1.5 rounded-full bg-green-400"></div>
                                  <span>Perfect for: Quick sketches, brainstorming</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}

        {/* Free Generation Info Card */}
        {selectedType === 'image_free' && (
          <Card className="border-2 border-green-200 bg-gradient-to-br from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 animate-in slide-in-from-top-2 duration-300">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2 text-green-700 dark:text-green-300">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                🎨 Free AI Image Generation
                <Badge variant="secondary" className="text-xs bg-green-100 text-green-700 border-green-300">
                  Unlimited & Free
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-3">
              <div className="text-sm text-muted-foreground leading-relaxed">
                Generate stunning images instantly using Pollinations AI. No API keys required, no limits!
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                  <span>Instant generation</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                  <span>Multiple AI models</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-purple-500"></div>
                  <span>No registration needed</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-orange-500"></div>
                  <span>High quality output</span>
                </div>
              </div>

              <div className="text-xs border-t pt-2">
                💡 <strong>Want original Nanobanana?</strong>{' '}
                <a
                  href="https://enter.pollinations.ai"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 underline font-medium"
                >
                  Visit enter.pollinations.ai →
                </a>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Generate Button */}
        <Button
          type="submit"
          className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]"
          disabled={isGenerating}
        >
          {isGenerating ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Creating Magic...
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              Generate Content
              <ArrowRight className="w-4 h-4" />
            </div>
          )}
        </Button>
      </form>
    </Form>
  );
}