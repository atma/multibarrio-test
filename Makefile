meli-install:

meli-test:

meli-build:
	@echo ""
	@echo "========================="
	@echo " Swift Uploader Starting"
	@echo "========================="
	
	@chmod 777 upload_files.sh
	./upload_files.sh "ui" "reputation_component" "$(VERSION)" "app_ui-reputation_component" "XwuPXr6FKc" "statics" "dist/statics";

	@echo "========================="
	@echo " Swift Uploader Finished"	
	@echo "========================="
	@echo ""

	@rm -rf ml-build
	@mkdir ml-build
	@touch ml-build/ml-build-finish.txt