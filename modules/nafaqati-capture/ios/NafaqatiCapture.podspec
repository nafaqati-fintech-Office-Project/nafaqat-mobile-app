Pod::Spec.new do |s|
  s.name           = 'NafaqatiCapture'
  s.version        = '1.0.0'
  s.summary        = 'Encrypted queue that the Nafaqati Shortcuts actions write to and the app reads from.'
  s.description    = 'Holds bank messages and card payments handed over by the Shortcuts automations until the app processes them.'
  s.author         = 'Nafaqati'
  s.homepage       = 'https://docs.expo.dev/modules/'
  s.platforms      = { :ios => '15.1' }
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }

  s.source_files = '**/*.{h,m,mm,swift,hpp,cpp}'
end
