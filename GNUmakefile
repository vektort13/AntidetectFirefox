# This Makefile is used as a shim to aid people with muscle memory
# so that they can type "make".
#
# This file and all of its targets should not be used by anything important.

check_defined = \
	$(strip $(foreach 1,$1, \
		$(call __check_defined,$1,$(strip $(value 2)))))
__check_defined = \
	$(if $(value $1),, \
		$(error Undefined $1$(if $2, ($2))))

all: build package

build: $(call check_defined, MOZCONFIG)
	SSH_CLIENT= SSH_CONNECTION= SSH_TTY= ./mach -v build

clean: $(call check_defined, MOZCONFIG)
	SSH_CLIENT= SSH_CONNECTION= SSH_TTY= ./mach clobber

package: $(call check_defined, MOZCONFIG)
	killall -QUIT antidetect antidetect-bin || exit 0
	SSH_CLIENT= SSH_CONNECTION= SSH_TTY= ./mach -v package

installer: $(call check_defined, MOZCONFIG)
	SSH_CLIENT= SSH_CONNECTION= SSH_TTY= ./mach -v build installer

.PHONY: all build clean installer
