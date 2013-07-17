
# Location of the Turbulenz checkout root
TZROOT := ../turbulenz_engine

# Location of templates.  Each .js file in the templates dir
# represents an application to be built
TEMPLATES_DIR := templates

# Other directories from which code may be included
INCLUDE_DIRS := .

# Apps that do not have a canvas version
NON_CANVAS_APPS :=

# Files to copy from somewhere else
EXTERNAL_SCRIPTFILES :=

# include the main application build file
include $(TZROOT)/scripts/appbuild.mk
